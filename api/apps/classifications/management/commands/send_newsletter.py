"""
Send a newsletter to everyone with newsletter_opt_in (active, verified email).

    python manage.py send_newsletter SLUG --subject "..." --dry-run     # who would get it, who is skipped and why
    python manage.py send_newsletter SLUG --subject "..." --test me@x.org   # one unlogged "[TEST]" copy
    python manage.py send_newsletter SLUG --subject "..." --only a@x.org    # real, logged, just these people
    python manage.py send_newsletter SLUG --subject "..."               # real send to the whole list

Body: docs/newsletters/SLUG.html and SLUG.txt. Each real send is logged in
EngagementEmail (dedupe key newsletter:SLUG): re-running never double-sends.
"""
from collections import Counter

from django.core.management.base import BaseCommand, CommandError

from apps.classifications import newsletter
from apps.classifications.models import EngagementEmail, UserProfile


class Command(BaseCommand):
    help = "Send (or preview with --dry-run) a newsletter."

    def add_arguments(self, parser):
        parser.add_argument('slug')
        parser.add_argument('--subject', required=True)
        parser.add_argument('--dry-run', action='store_true', help='List recipients; send and log nothing.')
        parser.add_argument('--test', metavar='EMAIL', help='Send one unlogged [TEST] copy to this registered user.')
        parser.add_argument('--only', action='append', default=[], metavar='EMAIL', help='Restrict to these recipients (repeatable).')
        parser.add_argument('--exclude', action='append', default=[], metavar='EMAIL', help='Leave these recipients out (repeatable).')

    def handle(self, *args, **o):
        slug, subject = o['slug'], o['subject']
        try:
            body_html, body_text = newsletter.load_content(slug)
        except FileNotFoundError as exc:
            raise CommandError(f'Content not found: {exc.filename}')

        if o['test']:
            profile = UserProfile.objects.select_related('user').filter(user__email__iexact=o['test']).first()
            if not profile:
                raise CommandError(f"No user with email {o['test']}")
            newsletter.build_message(profile, slug, subject, body_html, body_text, subject_prefix='[TEST] ').send()
            self.stdout.write(self.style.SUCCESS(f"Test sent to {profile.user.email} (not logged)."))
            return

        to_send, skipped = newsletter.recipients(slug, only_emails=o['only'] or None)
        excluded = {e.lower() for e in o['exclude']}
        skipped += [(p, 'excluded by hand') for p in to_send if p.user.email.lower() in excluded]
        to_send = [p for p in to_send if p.user.email.lower() not in excluded]

        reasons = Counter(r for _, r in skipped)
        no_date = sum(1 for p in to_send if not p.newsletter_opt_in_at)
        self.stdout.write(f"Newsletter '{slug}': {len(to_send)} to send, {len(skipped)} skipped "
                          f"({', '.join(f'{r}: {n}' for r, n in reasons.items()) or 'none'}).")
        self.stdout.write(f"Of those to send, {no_date} have no consent date (newsletter_opt_in_at).")
        if o['dry_run']:
            if o['verbosity'] >= 2:
                for p in to_send:
                    self.stdout.write(f"  send  {p.user.email}")
                for p, r in skipped:
                    self.stdout.write(f"  skip  {p.user.email}  ({r})")
            self.stdout.write("Dry run: nothing sent.")
            return

        results = Counter()
        for p in to_send:
            results[newsletter.send_one(p, slug, subject, body_html, body_text).status] += 1
        self.stdout.write(self.style.SUCCESS(
            f"Done: {results[EngagementEmail.STATUS_SENT]} sent, {results[EngagementEmail.STATUS_FAILED]} failed."))
