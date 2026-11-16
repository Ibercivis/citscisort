"""
Email preferences chosen on the sign-up form.

Run: python manage.py test apps.classifications.tests.test_registration_prefs --settings=config.settings_test
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()
PW = 'Zq7!longpassword-ok'


class RegistrationPrefsTests(TestCase):
    def register(self, email, **extra):
        r = APIClient().post('/api/auth/registration/',
                             {'email': email, 'password1': PW, 'password2': PW, **extra}, format='json')
        self.assertLess(r.status_code, 300, r.content)
        return User.objects.get(email=email).classification_profile

    def test_defaults_no_newsletter_reminders_on(self):
        p = self.register('a@example.org')
        self.assertFalse(p.newsletter_opt_in)
        self.assertIsNone(p.newsletter_opt_in_at)
        self.assertTrue(p.activity_emails_opt_in)

    def test_newsletter_tick_records_consent_date(self):
        p = self.register('b@example.org', newsletter_opt_in=True)
        self.assertTrue(p.newsletter_opt_in)
        self.assertIsNotNone(p.newsletter_opt_in_at)

    def test_reminders_untick_records_opt_out(self):
        p = self.register('c@example.org', activity_emails_opt_in=False)
        self.assertFalse(p.activity_emails_opt_in)
        self.assertIsNotNone(p.activity_emails_opt_out_at)
        self.assertFalse(p.newsletter_opt_in)
