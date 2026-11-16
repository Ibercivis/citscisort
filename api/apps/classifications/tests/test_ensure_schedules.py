"""
Run: python manage.py test apps.classifications.tests.test_ensure_schedules --settings=config.settings_test
"""
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase


class FakeJob:
    def __init__(self, id):
        self.id = id


class EnsureSchedulesTests(TestCase):
    def run_cmd(self, registered, *args):
        scheduler = mock.Mock()
        scheduler.get_jobs.return_value = [FakeJob(i) for i in registered]
        out = StringIO()
        with mock.patch('django_rq.get_scheduler', return_value=scheduler), \
             mock.patch('apps.classifications.management.commands.ensure_schedules.call_command') as cc:
            try:
                call_command('ensure_schedules', *args, stdout=out)
                code = 0
            except SystemExit as e:
                code = e.code
        return out.getvalue(), cc, code

    def test_nothing_missing_does_nothing(self):
        out, cc, code = self.run_cmd(['citscisort:stats-snapshot', 'citscisort:engagement-emails'])
        self.assertEqual(code, 0)
        cc.assert_not_called()

    def test_registers_only_what_is_missing(self):
        out, cc, code = self.run_cmd(['citscisort:stats-snapshot'])
        cc.assert_called_once_with('schedule_engagement_emails')

    def test_check_mode_reports_and_changes_nothing(self):
        out, cc, code = self.run_cmd([], '--check')
        self.assertEqual(code, 1)
        cc.assert_not_called()
        self.assertIn('MISSING', out)

    def test_skip_engagement(self):
        out, cc, code = self.run_cmd([], '--skip-engagement')
        cc.assert_called_once_with('schedule_stats')
