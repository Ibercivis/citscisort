"""
Run the engagement email policy by hand.

    python manage.py send_engagement_emails --dry-run          # who would get what, and who is skipped and why
    python manage.py send_engagement_emails --dry-run -v 2     # ...including every skipped person
    python manage.py send_engagement_emails --user me@x.org --force   # send to one person even if disabled
    python manage.py send_engagement_emails                    # real run (needs ENGAGEMENT_EMAILS_ENABLED=True)

Real runs are normally done by the scheduled RQ job; this is for testing and
for one-off sends.
"""
from collections import Counter

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.classifications.engagement import run


class Command(BaseCommand):
    help = "Send (or preview with --dry-run) today's engagement emails."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Decide but do not send or log anything.')
        parser.add_argument('--limit', type=int, default=None,
                            help='Send at most N emails this run (overrides ENGAGEMENT_EMAILS["MAX_PER_RUN"]).')
        parser.add_argument('--user', action='append', default=[], metavar='EMAIL',
                            help='Only consider this user (repeatable).')
        parser.add_argument('--force', action='store_true',
                            help='Send even if ENGAGEMENT_EMAILS_ENABLED is False.')

    def handle(self, *args, **options):
        users = None
        if options['user']:
            User = get_user_model()
            users = list(User.objects.filter(email__in=options['user']))
            missing = set(options['user']) - {u.email for u in users}
            if missing:
                raise CommandError(f"Unknown user(s): {', '.join(sorted(missing))}")

        summary = run(dry_run=options['dry_run'], limit=options['limit'], users=users, force=options['force'])

        mode = 'DRY RUN' if summary['dry_run'] else ('SEND' if summary['enabled'] else 'DISABLED (nothing sent)')
        self.stdout.write(self.style.MIGRATE_HEADING(f"Engagement emails — {mode}"))

        for c in summary['candidates']:
            self.stdout.write(f"  {c.user.email:40} {c.email_type:20} {c.dedupe_key:40} {c.payload}")
        if not summary['candidates']:
            self.stdout.write("  (no one is due an email)")

        reasons = Counter(reason.split(' (')[0] for _, reason in summary['skipped'])
        self.stdout.write(f"\nThis run: {len(summary['candidates'])}   "
                          f"Due but over the per-run cap: {len(summary['deferred'])}   "
                          f"Skipped: {len(summary['skipped'])} "
                          + ', '.join(f'{k}: {v}' for k, v in reasons.most_common()))
        if options['verbosity'] >= 2:
            for user, reason in summary['skipped']:
                self.stdout.write(f"    skip {user.email:40} {reason}")

        if not summary['dry_run'] and summary['enabled']:
            style = self.style.SUCCESS if not summary['failed'] else self.style.ERROR
            self.stdout.write(style(f"Sent: {summary['sent']}   Failed: {summary['failed']}"))
