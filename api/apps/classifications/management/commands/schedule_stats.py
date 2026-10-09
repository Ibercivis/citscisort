"""
Register (or refresh) the recurring RQ-Scheduler job that regenerates the public
stats snapshot once a day.

Idempotent by design: the job is scheduled with a fixed, project-prefixed id, so
re-running just updates the same entry (rq-scheduler keys its scheduled-jobs set
by job id) instead of stacking duplicates. Safe to run on every deploy.

    python manage.py schedule_stats              # default: daily at 00:00 UTC
    python manage.py schedule_stats --cron "30 3 * * *"
    python manage.py schedule_stats --now        # also run it once immediately

Redis is shared with other projects, so citscisort runs on its own DB (db5, set
via REDIS_URL). Isolation is by DB number, NOT by queue name: rq-scheduler stores
all scheduled jobs under one non-namespaced key per DB, so a shared DB lets other
projects' restarts wipe this job. The project-prefixed job id below is an extra
guard against id collisions within our own DB.

The rqscheduler process must be running for the cron entry to fire; the rqworker
process executes the enqueued job. See deploy/supervisor/.
"""
from django.conf import settings
from django.core.management.base import BaseCommand

import django_rq

# Project-prefixed as a secondary guard against id collisions (primary isolation
# is the dedicated Redis DB, db5 — see module docstring).
JOB_ID = 'citscisort:stats-snapshot'
JOB_FUNC = 'apps.classifications.jobs.generate_stats_snapshot'


class Command(BaseCommand):
    help = "Schedule the daily public stats snapshot job (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--cron',
            default='0 0 * * *',
            help='Cron expression (UTC) for the recurring job. Default: "0 0 * * *" (daily at midnight).',
        )
        parser.add_argument(
            '--now',
            action='store_true',
            help='Also enqueue the job once immediately (useful for a first run / smoke test).',
        )

    def handle(self, *args, **options):
        queue_name = settings.RQ_SCHEDULER_QUEUE
        scheduler = django_rq.get_scheduler(queue_name)
        cron = options['cron']

        scheduler.cron(
            cron,
            func=JOB_FUNC,
            queue_name=queue_name,
            id=JOB_ID,            # fixed id → re-scheduling updates, never duplicates
            use_local_timezone=False,  # cron expression is interpreted in UTC
        )
        self.stdout.write(self.style.SUCCESS(
            f"Scheduled '{JOB_ID}' on queue '{queue_name}' with cron \"{cron}\" (UTC)."
        ))

        if options['now']:
            queue = django_rq.get_queue(queue_name)
            queue.enqueue(JOB_FUNC)
            self.stdout.write(self.style.SUCCESS("Enqueued one immediate run."))
