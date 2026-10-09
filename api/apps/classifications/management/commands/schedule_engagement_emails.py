"""
Register (or refresh) the recurring RQ-Scheduler job that sends engagement
emails once a day. Same idempotent pattern as ``schedule_stats`` (fixed,
project-prefixed job id → re-running updates instead of duplicating; safe on
every deploy). See that command's docstring for the Redis/isolation notes.

    python manage.py schedule_engagement_emails              # default: daily at 09:00 UTC
    python manage.py schedule_engagement_emails --cron "0 8 * * *"
    python manage.py schedule_engagement_emails --now        # also enqueue one run right away

The job only sends when ENGAGEMENT_EMAILS_ENABLED=True; otherwise it logs the
candidates it would have emailed and exits.
"""
from django.conf import settings
from django.core.management.base import BaseCommand

import django_rq

JOB_ID = 'citscisort:engagement-emails'
JOB_FUNC = 'apps.classifications.jobs.send_engagement_emails'


class Command(BaseCommand):
    help = "Schedule the daily engagement emails job (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--cron',
            default='0 9 * * *',
            help='Cron expression (UTC) for the recurring job. Default: "0 9 * * *" (daily at 09:00 UTC).',
        )
        parser.add_argument(
            '--now',
            action='store_true',
            help='Also enqueue the job once immediately.',
        )

    def handle(self, *args, **options):
        queue_name = settings.RQ_SCHEDULER_QUEUE
        scheduler = django_rq.get_scheduler(queue_name)
        cron = options['cron']

        scheduler.cron(
            cron,
            func=JOB_FUNC,
            queue_name=queue_name,
            id=JOB_ID,
            use_local_timezone=False,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Scheduled '{JOB_ID}' on queue '{queue_name}' with cron \"{cron}\" (UTC)."
        ))
        if not settings.ENGAGEMENT_EMAILS_ENABLED:
            self.stdout.write(self.style.WARNING(
                "ENGAGEMENT_EMAILS_ENABLED is False: the job will run but send nothing "
                "until you enable it in .env."
            ))

        if options['now']:
            django_rq.get_queue(queue_name).enqueue(JOB_FUNC)
            self.stdout.write(self.style.SUCCESS("Enqueued one immediate run."))
