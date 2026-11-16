"""
Tests for DailyActivity recording and the staff endpoint.

Run: python manage.py test apps.classifications.tests.test_daily_activity --settings=config.settings_test
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.classifications.models import DailyActivity

User = get_user_model()


@override_settings(TIME_ZONE='Europe/Madrid', USE_TZ=True)
class DailyActivityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('u', 'u@example.org', 'x')
        self.staff = User.objects.create_user('s', 's@example.org', 'x', is_staff=True)

    def client_for(self, user):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Token ' + Token.objects.get_or_create(user=user)[0].key)
        return c

    def test_first_request_records_once_per_day(self):
        c = self.client_for(self.user)
        c.get('/api/notifications/unread_count/')
        c.get('/api/notifications/unread_count/')
        self.assertEqual(DailyActivity.objects.filter(user=self.user).count(), 1)
        self.assertEqual(DailyActivity.objects.get(user=self.user).date, timezone.localdate())

    def test_recorded_even_if_cache_is_cold(self):
        c = self.client_for(self.user)
        c.get('/api/notifications/unread_count/')
        cache.clear()
        c.get('/api/notifications/unread_count/')
        self.assertEqual(DailyActivity.objects.filter(user=self.user).count(), 1)

    def test_bad_token_records_nothing(self):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Token nope')
        c.get('/api/notifications/unread_count/')
        self.assertEqual(DailyActivity.objects.count(), 0)

    def test_staff_endpoint_forbidden_for_normal_user_and_anonymous(self):
        self.assertEqual(APIClient().get('/api/staff/daily-activity/').status_code, 401)
        self.assertEqual(self.client_for(self.user).get('/api/staff/daily-activity/').status_code, 403)

    def test_staff_endpoint_lists_days_and_users(self):
        self.client_for(self.user).get('/api/notifications/unread_count/')
        r = self.client_for(self.staff).get('/api/staff/daily-activity/?days=7')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(len(data['results']), 7)
        today = data['results'][-1]
        self.assertEqual(today['date'], timezone.localdate().isoformat())
        self.assertEqual(today['active_count'], 2)  # the user and the staff member themselves
        self.assertIn('u', [x['username'] for x in today['users']])
        self.assertEqual(data['tracking_since'], timezone.localdate().isoformat())

    def test_days_param_is_clamped(self):
        r = self.client_for(self.staff).get('/api/staff/daily-activity/?days=99999')
        self.assertEqual(len(r.json()['results']), 365)
        r = self.client_for(self.staff).get('/api/staff/daily-activity/?days=abc')
        self.assertEqual(len(r.json()['results']), 60)

    def test_deleting_user_deletes_activity(self):
        self.client_for(self.user).get('/api/notifications/unread_count/')
        self.user.delete()
        self.assertEqual(DailyActivity.objects.count(), 0)


@override_settings(TIME_ZONE='Europe/Madrid', USE_TZ=True)
class StaffOverviewTests(TestCase):
    def setUp(self):
        from apps.abstracts.models import Abstract
        self.user = User.objects.create_user('u', 'u@example.org', 'x')
        self.staff = User.objects.create_user('s', 's@example.org', 'x', is_staff=True)
        self.abs = [Abstract.objects.create(title=f't{i}', abstract_text='x', doi=f'10.1/{i}',
                                            required_classifications=3) for i in range(2)]

    def get(self, user, url='/api/staff/overview/?days=7'):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Token ' + Token.objects.get_or_create(user=user)[0].key)
        return c.get(url)

    def test_forbidden_for_non_staff(self):
        self.assertEqual(self.get(self.user).status_code, 403)

    def test_shape_and_numbers(self):
        from apps.classifications.models import Classification
        Classification.objects.create(user=self.user, abstract=self.abs[0], main_classification='x')
        Classification.objects.create(user=self.user, abstract=self.abs[1], main_classification='x', is_training=True)
        r = self.get(self.staff).json()
        self.assertEqual(len(r['series']), 7)
        self.assertEqual(r['series'][-1]['classifications'], 1)  # training one excluded
        self.assertEqual(r['series'][-1]['signups'], 2)
        self.assertEqual(r['series'][-1]['users_total'], 2)
        self.assertEqual(r['progress']['abstracts_total'], 2)
        self.assertEqual([f['step'] for f in r['funnel']][0], 'Registered')
        self.assertEqual(r['funnel'][2]['users'], 1)
        self.assertEqual(r['progress']['pace_window_days'], 7)
        self.assertAlmostEqual(r['progress']['pace_per_day'], round(1 / 7, 1))


@override_settings(TIME_ZONE='Europe/Madrid', USE_TZ=True)
class EmailSendsTests(TestCase):
    def test_batches_with_before_and_after(self):
        from datetime import timedelta
        from apps.abstracts.models import Abstract
        from apps.classifications.models import Classification, EngagementEmail
        from apps.classifications.staff_views import email_sends
        today = timezone.localdate()
        a = User.objects.create_user('a', 'a@example.org', 'x')
        b = User.objects.create_user('b', 'b@example.org', 'x')
        for u in (a, b):
            EngagementEmail.objects.create(user=u, email_type='newsletter', dedupe_key='newsletter:nov',
                                           recipient_email=u.email, status='sent')
        EngagementEmail.objects.create(user=a, email_type='milestone', dedupe_key='milestone:10',
                                       recipient_email=a.email, status='sent')
        EngagementEmail.objects.create(user=b, email_type='milestone', dedupe_key='milestone:10',
                                       recipient_email=b.email, status='failed')
        ab = Abstract.objects.create(title='t', abstract_text='x', doi='10.1/z', required_classifications=3)
        Classification.objects.create(user=a, abstract=ab, main_classification='x')   # today = "after"
        DailyActivity.objects.create(user=b, date=today)

        sends = {s['kind']: s for s in email_sends(today)}
        n = sends['newsletter']
        self.assertEqual((n['label'], n['sent'], n['date']), ('nov', 2, today))
        self.assertEqual((n['classified_before'], n['classified_after'], n['classifications_after']), (0, 1, 1))
        self.assertEqual(n['active_after'], 1)
        self.assertFalse(n['window_complete'])
        self.assertEqual(n['days_elapsed'], 1)
        self.assertEqual(sends['reminders']['sent'], 1)   # failed row not counted
