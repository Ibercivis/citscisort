"""
Tests for the daily count and streak (apps/classifications/activity.py).

Run: python manage.py test apps.classifications.tests.test_activity --settings=config.settings_test
"""
from datetime import date, datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.abstracts.models import Abstract
from apps.classifications import activity
from apps.classifications.models import Classification

User = get_user_model()
MADRID = ZoneInfo('Europe/Madrid')


def at(day, hour=12, minute=0):
    """A Madrid wall-clock time as an aware datetime."""
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=MADRID)


@override_settings(TIME_ZONE='Europe/Madrid', USE_TZ=True)
class ActivitySummaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@example.org', password='x')
        self.n = 0

    def classify(self, when, **kw):
        self.n += 1
        abstract = Abstract.objects.create(title=f'a{self.n}', abstract_text='t', doi=f'10.1/{self.n}')
        c = Classification.objects.create(
            user=self.user, abstract=abstract, main_classification='main_other', **kw)
        Classification.objects.filter(pk=c.pk).update(created_at=when)

    def summary(self, now):
        return activity.activity_summary(self.user, now=now)

    def test_no_activity(self):
        self.assertEqual(self.summary(at(date(2026, 10, 16))),
                         {'today': 0, 'streak_days': 0, 'best_streak_days': 0})

    def test_streak_ending_today_and_count(self):
        for d in (14, 15, 16):
            self.classify(at(date(2026, 10, d)))
        self.classify(at(date(2026, 10, 16), 18))
        s = self.summary(at(date(2026, 10, 16), 20))
        self.assertEqual((s['today'], s['streak_days'], s['best_streak_days']), (2, 3, 3))

    def test_streak_alive_if_only_yesterday(self):
        self.classify(at(date(2026, 10, 14)))
        self.classify(at(date(2026, 10, 15)))
        s = self.summary(at(date(2026, 10, 16), 9))
        self.assertEqual((s['today'], s['streak_days']), (0, 2))

    def test_streak_broken_after_missed_day(self):
        self.classify(at(date(2026, 10, 13)))
        self.classify(at(date(2026, 10, 14)))
        s = self.summary(at(date(2026, 10, 16), 9))
        self.assertEqual((s['streak_days'], s['best_streak_days']), (0, 2))

    def test_best_streak_is_longest_run(self):
        for d in (1, 2, 3, 4, 10, 11, 12):
            self.classify(at(date(2026, 10, d)))
        s = self.summary(at(date(2026, 10, 12), 20))
        self.assertEqual((s['streak_days'], s['best_streak_days']), (3, 4))

    def test_madrid_midnight_not_utc(self):
        # 00:30 Madrid on the 16th is 22:30 UTC on the 15th (CEST, UTC+2).
        self.classify(at(date(2026, 10, 16), 0, 30))
        s = self.summary(at(date(2026, 10, 16), 1))
        self.assertEqual((s['today'], s['streak_days']), (1, 1))
        # 23:30 Madrid on the 15th is 21:30 UTC the same day: still the 15th.
        self.classify(at(date(2026, 10, 15), 23, 30))
        s = self.summary(at(date(2026, 10, 16), 1))
        self.assertEqual((s['today'], s['streak_days']), (1, 2))

    def test_dst_change_does_not_break_streak(self):
        # Clocks go back on 2026-10-25 (25-hour day).
        for d in (24, 25, 26):
            self.classify(at(date(2026, 10, d), 23, 30))
        s = self.summary(at(date(2026, 10, 26), 23, 45))
        self.assertEqual(s['streak_days'], 3)

    def test_training_and_invalid_do_not_count(self):
        self.classify(at(date(2026, 10, 16)), is_training=True)
        self.classify(at(date(2026, 10, 16)), is_valid=False)
        s = self.summary(at(date(2026, 10, 16), 20))
        self.assertEqual((s['today'], s['streak_days']), (0, 0))
