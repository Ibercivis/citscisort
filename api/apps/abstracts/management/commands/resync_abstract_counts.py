"""
Resync the denormalized Abstract.current_classifications_count and
consensus_reached from the real Classification rows.

These fields are normally maintained by a post_save signal, but data created
outside the API (seed/test/bulk imports) can leave them out of sync, which
skews challenge stats AND the next_abstract queue ordering (it prioritizes by
current_classifications_count) and consensus detection. This recomputes both
from the source of truth (valid classifications). Idempotent.
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from apps.abstracts.models import Abstract


class Command(BaseCommand):
    help = 'Resync Abstract.current_classifications_count and consensus_reached from real classifications'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change without writing')

    def handle(self, *args, **options):
        dry = options['dry_run']

        qs = Abstract.objects.annotate(
            real_count=Count('classifications', filter=Q(classifications__is_valid=True))
        )

        to_update = []
        count_fixes = consensus_gained = consensus_lost = 0
        for ab in qs.iterator():
            new_count = ab.real_count
            new_consensus = new_count >= ab.required_classifications
            if ab.current_classifications_count == new_count and ab.consensus_reached == new_consensus:
                continue
            if ab.current_classifications_count != new_count:
                count_fixes += 1
            if ab.consensus_reached != new_consensus:
                if new_consensus:
                    consensus_gained += 1
                else:
                    consensus_lost += 1
            ab.current_classifications_count = new_count
            ab.consensus_reached = new_consensus
            to_update.append(ab)

        self.stdout.write(f'Abstracts needing update: {len(to_update)}')
        self.stdout.write(f'  count fixes:            {count_fixes}')
        self.stdout.write(f'  consensus set -> True:  {consensus_gained}')
        self.stdout.write(f'  consensus set -> False: {consensus_lost}')

        if dry:
            self.stdout.write(self.style.WARNING('Dry run — no changes written.'))
            return

        Abstract.objects.bulk_update(
            to_update,
            ['current_classifications_count', 'consensus_reached'],
            batch_size=1000,
        )
        self.stdout.write(self.style.SUCCESS(f'Updated {len(to_update)} abstracts.'))
