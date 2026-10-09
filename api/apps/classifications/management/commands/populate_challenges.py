"""
Build the Challenge catalog: the General challenge + the top-N keyword challenges
+ the top-N journal challenges, ranked by number of abstracts.

A Challenge is just a lens over the global corpus, so this command only decides
*which* lenses are offered. Run `populate_keywords` first (keyword ranking reads
Keyword.abstract_count). Idempotent: upserts the current top-N and deactivates
keyword/journal challenges that fell out of the top-N. Also refreshes the cached
total/completed stats on every challenge.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from apps.abstracts.models import Abstract
from apps.classifications.models import Challenge, Keyword, WosCategory


class Command(BaseCommand):
    help = 'Create/refresh the General + top-N keyword + top-N journal + top-N WoS-category challenges'

    def add_arguments(self, parser):
        parser.add_argument('--top', type=int, default=30,
                            help='How many keyword/journal/WoS-category challenges to offer (default: 30)')

    def handle(self, *args, **options):
        top = options['top']
        kept_ids = []

        with transaction.atomic():
            # 1. General challenge (whole corpus).
            general, _ = Challenge.objects.get_or_create(
                challenge_type=Challenge.TYPE_GENERAL,
                defaults={'title': 'General', 'slug': 'general'},
            )
            general.is_active = True
            general.save(update_fields=['is_active'])
            kept_ids.append(general.id)

            # 2. Top-N keyword challenges (by cached Keyword.abstract_count).
            for kw in Keyword.objects.order_by('-abstract_count')[:top]:
                ch, _ = Challenge.objects.update_or_create(
                    challenge_type=Challenge.TYPE_KEYWORD,
                    keyword=kw,
                    defaults={'title': kw.label, 'is_active': True},
                )
                kept_ids.append(ch.id)

            # 3. Top-N journal challenges (by live abstract count).
            top_journals = (
                Abstract.objects.filter(is_active=True).exclude(journal='')
                .values('journal').annotate(n=Count('id')).order_by('-n')[:top]
            )
            for row in top_journals:
                ch, _ = Challenge.objects.update_or_create(
                    challenge_type=Challenge.TYPE_JOURNAL,
                    journal_name=row['journal'],
                    defaults={'title': row['journal'], 'is_active': True},
                )
                kept_ids.append(ch.id)

            # 4. Top-N WoS-category challenges (by cached WosCategory.abstract_count).
            for wc in WosCategory.objects.order_by('-abstract_count')[:top]:
                ch, _ = Challenge.objects.update_or_create(
                    challenge_type=Challenge.TYPE_WOS,
                    wos_category=wc,
                    defaults={'title': wc.label, 'is_active': True},
                )
                kept_ids.append(ch.id)

            # 5. Deactivate keyword/journal/WoS-category challenges no longer in the top-N.
            stale = Challenge.objects.exclude(id__in=kept_ids).filter(is_active=True)
            stale_count = stale.update(is_active=False)

            # 6. Refresh cached stats on all active challenges.
            for ch in Challenge.objects.filter(is_active=True):
                scope = ch.get_abstract_queryset()
                ch.total_abstracts = scope.count()
                ch.completed_abstracts = scope.filter(consensus_reached=True).count()
                ch.save(update_fields=['total_abstracts', 'completed_abstracts', 'updated_at'])

        self.stdout.write(self.style.SUCCESS(
            f'Challenges ready: 1 general + up to {top} keywords + up to {top} journals '
            f'+ up to {top} WoS categories. {stale_count} deactivated.'
        ))
