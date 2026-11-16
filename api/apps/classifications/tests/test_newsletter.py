"""
Run: python manage.py test apps.classifications.tests.test_newsletter --settings=config.settings_test
"""
from io import StringIO
from unittest import mock

from django.core import mail
from django.core.management import call_command

from apps.classifications import newsletter
from apps.classifications.models import EngagementEmail
from .test_engagement import EngagementBase

CONTENT = ('<p>Hello body</p>', 'Hello body')


class NewsletterTests(EngagementBase):
    def sub(self, email, **kw):
        u = self.make_user(email, **kw)
        p = u.classification_profile
        p.newsletter_opt_in = True
        p.newsletter_opt_in_at = self.now
        p.save()
        return u

    def run_cmd(self, *args):
        out = StringIO()
        with mock.patch.object(newsletter, 'load_content', return_value=CONTENT):
            call_command('send_newsletter', 'nov', '--subject', 'News', *args, stdout=out)
        return out.getvalue()

    def test_only_opted_in_verified_people_get_it(self):
        self.sub('a@x.org')
        self.sub('unverified@x.org', verified=False)
        self.make_user('nonews@x.org')
        out = self.run_cmd()
        self.assertEqual([m.to for m in mail.outbox], [['a@x.org']])
        self.assertIn('1 sent, 0 failed', out)
        row = EngagementEmail.objects.get()
        self.assertEqual((row.email_type, row.dedupe_key, row.status), ('newsletter', 'newsletter:nov', 'sent'))

    def test_message_has_unsubscribe_reply_to_and_contact(self):
        self.sub('a@x.org')
        self.run_cmd()
        m = mail.outbox[0]
        self.assertEqual(m.reply_to, ['info@ibercivis.es'])
        self.assertIn('scope=newsletter', m.extra_headers['List-Unsubscribe'])
        html = m.alternatives[0][0]
        self.assertIn('scope=all', html)
        self.assertIn('info@ibercivis.es', html)
        self.assertNotIn('do not reply', html)
        self.assertIn('Hello body', html)

    def test_rerun_never_double_sends(self):
        self.sub('a@x.org')
        self.run_cmd()
        out = self.run_cmd()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('already sent: 1', out)

    def test_dry_run_and_exclude_send_nothing_to_them(self):
        self.sub('a@x.org')
        self.sub('b@x.org')
        self.assertIn('2 to send', self.run_cmd('--dry-run'))
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(EngagementEmail.objects.count(), 0)
        self.run_cmd('--exclude', 'b@x.org')
        self.assertEqual([m.to for m in mail.outbox], [['a@x.org']])

    def test_unsubscribed_person_is_not_emailed(self):
        u = self.sub('a@x.org')
        from django.urls import reverse
        from apps.classifications import engagement
        self.client.get(reverse('engagement-unsubscribe',
                                kwargs={'token': engagement.make_unsubscribe_token(u)}) + '?scope=newsletter')
        self.run_cmd()
        self.assertEqual(len(mail.outbox), 0)

    def test_test_copy_is_not_logged(self):
        self.sub('a@x.org')
        self.run_cmd('--test', 'a@x.org')
        self.assertEqual(mail.outbox[0].subject, '[TEST] News')
        self.assertEqual(EngagementEmail.objects.count(), 0)
