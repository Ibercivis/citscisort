"""
Make sure the recurring RQ jobs are actually scheduled; re-register any that
are missing. Idempotent and cheap, meant to run often from system cron
(which, unlike the Redis scheduler entries, survives Redis restarts/flushes):

    python manage.py ensure_schedules            # re-register what is missing
    python manage.py ensure_schedules --check    # only report; exit 1 if something is missing
    python manage.py ensure_schedules --skip-engagement   # stats only

Why: the scheduler's calendar lives in one Redis sorted set. If it is lost, the
job hashes can remain (status "scheduled") while nothing ever fires. This
command compares what is registered with what should be, and logs a WARNING
every time it has to repair something so we can see how often it happens.
"""
import logging

import django_rq
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from .schedule_engagement_emails import JOB_ID as ENGAGEMENT_JOB_ID
from .schedule_stats import JOB_ID as STATS_JOB_ID

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Re-register missing recurring jobs (stats snapshot, engagement emails)."

    def add_arguments(self, parser):
        parser.add_argument('--check', action='store_true', help='Report only; exit 1 if anything is missing.')
        parser.add_argument('--skip-engagement', action='store_true', help='Do not manage the engagement emails job.')

    def handle(self, *args, **options):
        scheduler = django_rq.get_scheduler(settings.RQ_SCHEDULER_QUEUE)
        registered = {job.id for job in scheduler.get_jobs()}

        wanted = [(STATS_JOB_ID, 'schedule_stats')]
        if not options['skip_engagement']:
            wanted.append((ENGAGEMENT_JOB_ID, 'schedule_engagement_emails'))

        missing = [(job_id, cmd) for job_id, cmd in wanted if job_id not in registered]
        for job_id, _ in wanted:
            self.stdout.write(f"{job_id}: {'MISSING' if any(job_id == m[0] for m in missing) else 'ok'}")

        if not missing:
            return
        if options['check']:
            raise SystemExit(1)
        for job_id, cmd in missing:
            logger.warning("Scheduled job %s was missing; re-registering with %s", job_id, cmd)
            call_command(cmd)
