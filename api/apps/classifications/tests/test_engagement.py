"""
Tests for the engagement email policy (apps/classifications/engagement.py).

Run: python manage.py test apps.classifications.tests.test_engagement --settings=config.settings_test
"""
from datetime import timedelta
from unittest import mock

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.abstracts.models import Abstract
from apps.classifications import engagement
from apps.classifications.models import Classification, EngagementEmail

User = get_user_model()

POLICY = {
    'COOLDOWN_DAYS': 7,
    'MAX_PER_RUN': 25,
    'MILESTONES': [10, 25, 50, 100, 250, 500, 1000],
    'MILESTONE_RECENCY_DAYS': 7,
    'NEVER_CLASSIFIED_ATTEMPT_DAYS': [7, 45],
    'LAPSED_ATTEMPT_DAYS': [14, 45],
}

ENABLED = dict(
    ENGAGEMENT_EMAILS_ENABLED=True,
    ENGAGEMENT_EMAILS=POLICY,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    API_PUBLIC_URL='https://api.example.org',
    FRONTEND_URL='https://app.example.org',
)


@override_settings(**ENABLED)
class EngagementBase(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self._abstract_seq = 0

    # -- fixtures -----------------------------------------------------------

    def make_user(self, email, joined_days_ago=30, verified=True, opt_in=True, classifications=0,
                  last_classified_days_ago=1):
        user = User.objects.create_user(username=email.split('@')[0], email=email, password='x')
        User.objects.filter(pk=user.pk).update(date_joined=self.now - timedelta(days=joined_days_ago))
        user.refresh_from_db()
        EmailAddress.objects.create(user=user, email=email, verified=verified, primary=True)
        if not opt_in:
            user.classification_profile.activity_emails_opt_in = False
            user.classification_profile.save()
        if classifications:
            self.classify(user, classifications, days_ago=last_classified_days_ago)
        return user

    def classify(self, user, n, days_ago=1):
        """Create n valid classifications, all dated ``days_ago`` days back."""
        when = self.now - timedelta(days=days_ago)
        for _ in range(n):
            self._abstract_seq += 1
            abstract = Abstract.objects.create(
                title=f'A{self._abstract_seq}', authors='x', abstract_text='y')
            c = Classification.objects.create(user=user, abstract=abstract, main_classification='meta_research')
            Classification.objects.filter(pk=c.pk).update(created_at=when)
        user.classification_profile.refresh_from_db()

    def candidates(self, now=None, **kw):
        cands, skipped = engagement.collect_candidates(now=now or self.now, **kw)
        return cands, dict((u.email, r) for u, r in skipped)


class TriggerTests(EngagementBase):
    def test_never_classified_first_attempt_after_7_days(self):
        self.make_user('a@x.org', joined_days_ago=7)
        self.make_user('b@x.org', joined_days_ago=3)
        cands, _ = self.candidates()
        self.assertEqual([(c.user.email, c.dedupe_key) for c in cands],
                         [('a@x.org', 'reengagement:never:1')])
        self.assertEqual(cands[0].email_type, EngagementEmail.TYPE_REENGAGEMENT_NEVER)

    def test_lapsed_after_14_days_keyed_by_last_classification_date(self):
        u = self.make_user('a@x.org', classifications=3, last_classified_days_ago=14)
        self.make_user('b@x.org', classifications=3, last_classified_days_ago=5)
        cands, _ = self.candidates()
        self.assertEqual(len(cands), 1)
        c = cands[0]
        self.assertEqual(c.user, u)
        self.assertEqual(c.email_type, EngagementEmail.TYPE_REENGAGEMENT_LAPSED)
        last = (self.now - timedelta(days=14)).strftime('%Y-%m-%d')
        self.assertEqual(c.dedupe_key, f'reengagement:lapsed:{last}:1')
        self.assertEqual(c.payload['attempt'], 1)
        self.assertEqual(c.payload['user_classifications'], 3)

    def test_reengagement_attempts_are_spaced_then_stop_for_good(self):
        u = self.make_user('a@x.org', classifications=1, last_classified_days_ago=200)
        # attempt 1 is due (even though 200 days have passed, we start at 1)
        summary = engagement.run(now=self.now)
        self.assertEqual(summary['sent'], 1)
        self.assertEqual(EngagementEmail.objects.get(user=u).payload['attempt'], 1)
        # a week later: cooldown over, but attempt 2 needs 31 days (45-14) since attempt 1
        cands, _ = self.candidates(now=self.now + timedelta(days=8))
        self.assertEqual(cands, [])
        # 31 days later: attempt 2
        cands, _ = self.candidates(now=self.now + timedelta(days=31))
        self.assertEqual([c.payload['attempt'] for c in cands], [2])
        engagement.run(now=self.now + timedelta(days=31))
        # and then never again
        cands, _ = self.candidates(now=self.now + timedelta(days=400))
        self.assertEqual(cands, [])

    def test_classifying_again_starts_a_fresh_lapse_cycle(self):
        u = self.make_user('a@x.org', classifications=1, last_classified_days_ago=60)
        engagement.run(now=self.now)
        self.assertEqual(EngagementEmail.objects.filter(user=u).count(), 1)
        # comes back, classifies, lapses again
        self.classify(u, 1, days_ago=0)
        later = self.now + timedelta(days=14)
        cands, _ = self.candidates(now=later)
        self.assertEqual(len(cands), 1)
        self.assertTrue(cands[0].dedupe_key.endswith(':1'))
        self.assertIn(self.now.strftime('%Y-%m-%d'), cands[0].dedupe_key)

    def test_milestone_highest_reached_and_only_once(self):
        u = self.make_user('a@x.org', classifications=12)
        cands, _ = self.candidates()
        self.assertEqual([c.dedupe_key for c in cands], ['milestone:10'])
        self.assertEqual(cands[0].payload, {
            'milestone': 10, 'user_classifications': 12,
            'last_classification_at': mock.ANY})
        engagement.run(now=self.now)
        # still at 12, a week later: nothing
        cands, _ = self.candidates(now=self.now + timedelta(days=8))
        self.assertEqual(cands, [])
        # crosses 25 (and we only ever announce the highest): milestone:25
        self.classify(u, 14, days_ago=-6)  # dated 2 days before the check below
        cands, _ = self.candidates(now=self.now + timedelta(days=8))
        self.assertEqual([c.dedupe_key for c in cands], ['milestone:25'])

    def test_milestone_skips_lower_ones_already_passed(self):
        u = self.make_user('a@x.org', classifications=60)
        engagement.run(now=self.now)  # sends milestone:50
        self.assertEqual(EngagementEmail.objects.get(user=u).dedupe_key, 'milestone:50')
        cands, _ = self.candidates(now=self.now + timedelta(days=8))
        self.assertEqual(cands, [])  # 10 and 25 are never sent retroactively

    def test_stale_milestone_is_not_backfilled(self):
        """Someone at 45 who stopped 30 days ago gets a re-engagement, not 'congrats on 25'."""
        self.make_user('a@x.org', classifications=45, last_classified_days_ago=30)
        cands, _ = self.candidates()
        self.assertEqual([c.email_type for c in cands], [EngagementEmail.TYPE_REENGAGEMENT_LAPSED])

    def test_milestone_beats_reengagement(self):
        u = self.make_user('a@x.org', classifications=10, last_classified_days_ago=5)
        cands, _ = self.candidates()
        self.assertEqual([c.email_type for c in cands], [EngagementEmail.TYPE_MILESTONE])
        self.assertEqual(cands[0].user, u)


class EligibilityTests(EngagementBase):
    def test_skip_reasons(self):
        self.make_user('out@x.org', joined_days_ago=30, opt_in=False)
        self.make_user('unverified@x.org', joined_days_ago=30, verified=False)
        inactive = self.make_user('inactive@x.org', joined_days_ago=30)
        User.objects.filter(pk=inactive.pk).update(is_active=False)
        self.make_user('ok@x.org', joined_days_ago=30)
        cands, skipped = self.candidates()
        self.assertEqual([c.user.email for c in cands], ['ok@x.org'])
        self.assertEqual(skipped['out@x.org'], 'opted out')
        self.assertEqual(skipped['unverified@x.org'], 'email not verified')
        self.assertEqual(skipped['inactive@x.org'], 'inactive account')

    def test_cooldown_blocks_a_second_email_within_7_days(self):
        u = self.make_user('a@x.org', classifications=12)
        engagement.run(now=self.now)
        self.classify(u, 14, days_ago=-2)  # now at 26 -> milestone:25 is due...
        cands, skipped = self.candidates(now=self.now + timedelta(days=3))
        self.assertEqual(cands, [])
        self.assertTrue(skipped['a@x.org'].startswith('cooldown'))
        cands, _ = self.candidates(now=self.now + timedelta(days=8))
        self.assertEqual([c.dedupe_key for c in cands], ['milestone:25'])


class SendingTests(EngagementBase):
    def test_run_sends_logs_and_sets_unsubscribe_headers(self):
        u = self.make_user('a@x.org', joined_days_ago=10)
        summary = engagement.run(now=self.now)
        self.assertEqual((summary['sent'], summary['failed']), (1, 0))
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.to, ['a@x.org'])
        self.assertIn('List-Unsubscribe', msg.extra_headers)
        self.assertEqual(msg.extra_headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
        url = msg.extra_headers['List-Unsubscribe'][1:-1]
        self.assertTrue(url.startswith('https://api.example.org/api/emails/unsubscribe/'))
        self.assertIn(url, msg.body)                       # same token in text...
        self.assertIn(url, msg.alternatives[0][0])         # ...and in html
        row = EngagementEmail.objects.get(user=u)
        self.assertEqual(row.status, EngagementEmail.STATUS_SENT)
        self.assertEqual(row.email_type, EngagementEmail.TYPE_REENGAGEMENT_NEVER)
        self.assertEqual(row.recipient_email, 'a@x.org')
        self.assertEqual(row.subject, msg.subject)
        self.assertEqual(row.payload['attempt'], 1)

    def test_dry_run_sends_and_logs_nothing(self):
        self.make_user('a@x.org', joined_days_ago=10)
        summary = engagement.run(dry_run=True, now=self.now)
        self.assertEqual(len(summary['candidates']), 1)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(EngagementEmail.objects.count(), 0)

    @override_settings(ENGAGEMENT_EMAILS_ENABLED=False)
    def test_disabled_sends_nothing_unless_forced(self):
        self.make_user('a@x.org', joined_days_ago=10)
        summary = engagement.run(now=self.now)
        self.assertFalse(summary['enabled'])
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(EngagementEmail.objects.count(), 0)
        summary = engagement.run(now=self.now, force=True)
        self.assertEqual(summary['sent'], 1)

    def test_failed_send_is_logged_and_retried(self):
        u = self.make_user('a@x.org', joined_days_ago=10)
        with mock.patch('apps.classifications.engagement.EmailMultiAlternatives.send',
                        side_effect=RuntimeError('SES down')):
            summary = engagement.run(now=self.now)
        self.assertEqual((summary['sent'], summary['failed']), (0, 1))
        row = EngagementEmail.objects.get(user=u)
        self.assertEqual(row.status, EngagementEmail.STATUS_FAILED)
        self.assertIn('SES down', row.error)
        # next day: failed rows neither dedupe nor trigger the cooldown -> retried, same row
        summary = engagement.run(now=self.now + timedelta(days=1))
        self.assertEqual(summary['sent'], 1)
        row.refresh_from_db()
        self.assertEqual((row.status, row.error), (EngagementEmail.STATUS_SENT, ''))
        self.assertEqual(EngagementEmail.objects.count(), 1)

    def test_per_run_cap_prioritises_milestones_then_recently_active(self):
        self.make_user('old@x.org', classifications=1, last_classified_days_ago=100)
        self.make_user('recent@x.org', classifications=1, last_classified_days_ago=20)
        self.make_user('star@x.org', classifications=10)
        cands, _ = self.candidates()
        self.assertEqual([c.user.email for c in cands], ['star@x.org', 'recent@x.org', 'old@x.org'])
        summary = engagement.run(now=self.now, limit=1)
        self.assertEqual([c.user.email for c in summary['candidates']], ['star@x.org'])
        self.assertEqual([c.user.email for c in summary['deferred']], ['recent@x.org', 'old@x.org'])
        self.assertEqual(len(mail.outbox), 1)
        with override_settings(ENGAGEMENT_EMAILS={**POLICY, 'MAX_PER_RUN': 1}):
            summary = engagement.run(now=self.now + timedelta(days=1))
        self.assertEqual([c.user.email for c in summary['candidates']], ['recent@x.org'])

    def test_users_filter(self):
        a = self.make_user('a@x.org', joined_days_ago=10)
        self.make_user('b@x.org', joined_days_ago=10)
        summary = engagement.run(now=self.now, users=[a])
        self.assertEqual([m.to for m in mail.outbox], [['a@x.org']])


class UnsubscribeViewTests(EngagementBase):
    def test_get_and_post_opt_out(self):
        u = self.make_user('a@x.org')
        url = reverse('engagement-unsubscribe', kwargs={'token': engagement.make_unsubscribe_token(u)})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'Unsubscribed', resp.content)
        p = u.classification_profile
        p.refresh_from_db()
        self.assertFalse(p.activity_emails_opt_in)
        self.assertIsNotNone(p.activity_emails_opt_out_at)
        # idempotent, and POST (RFC 8058) works without CSRF
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'already unsubscribed', resp.content)
        # and the policy now skips them
        _, skipped = self.candidates()
        self.assertEqual(skipped['a@x.org'], 'opted out')

    def test_bad_token(self):
        resp = self.client.get(reverse('engagement-unsubscribe', kwargs={'token': 'nope'}))
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'Invalid link', resp.content)
        self.assertEqual(EngagementEmail.objects.count(), 0)
