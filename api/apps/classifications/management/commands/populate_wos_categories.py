"""
Normalize the free-text `Abstract.wos_categories` field (WoS WC field) into the
WosCategory table and rebuild the Abstract<->WosCategory M2M links.

Mirrors `populate_keywords`: split on ';', lowercase, strip, collapse whitespace,
dedupe per article. `Abstract.wos_categories` is left untouched. Idempotent:
upserts categories (never deletes rows, so it won't cascade-delete wos_category
Challenges) and fully rebuilds the M2M links.
"""
from collections import Counter, defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.abstracts.models import Abstract
from apps.classifications.models import WosCategory


def normalize(raw):
    """Canonical form for matching: lowercase, strip, collapse inner whitespace."""
    return ' '.join(raw.strip().lower().split())


class Command(BaseCommand):
    help = 'Normalize Abstract.wos_categories into the WosCategory table and rebuild M2M links'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-count', type=int, default=1,
            help='Only keep categories appearing in at least N abstracts (default: 1 = all)'
        )

    def handle(self, *args, **options):
        min_count = options['min_count']

        spellings = defaultdict(Counter)   # norm -> Counter(original spelling)
        abstract_ids = defaultdict(set)    # norm -> {abstract_id}

        rows = Abstract.objects.exclude(wos_categories='').values_list('id', 'wos_categories')
        for aid, text in rows.iterator():
            seen = set()
            for raw in text.split(';'):
                original = raw.strip()
                norm = normalize(original)
                if not norm or norm in seen:
                    continue
                seen.add(norm)
                spellings[norm][original] += 1
                abstract_ids[norm].add(aid)

        keep = {n: ids for n, ids in abstract_ids.items() if len(ids) >= min_count}
        self.stdout.write(
            f'Found {len(abstract_ids)} distinct WoS categories; '
            f'keeping {len(keep)} with >= {min_count} abstract(s).'
        )

        Through = WosCategory.abstracts.through
        used_slugs = set(WosCategory.objects.values_list('slug', flat=True))

        def unique_slug(norm):
            base = slugify(norm)[:260] or 'wc'
            slug, i = base, 2
            while slug in used_slugs:
                slug = f'{base}-{i}'
                i += 1
            used_slugs.add(slug)
            return slug

        created_count = 0
        objs = {}

        with transaction.atomic():
            for norm, ids in keep.items():
                label = spellings[norm].most_common(1)[0][0]
                wc, created = WosCategory.objects.get_or_create(
                    name=norm,
                    defaults={'label': label, 'slug': unique_slug(norm),
                              'abstract_count': len(ids)},
                )
                if created:
                    created_count += 1
                else:
                    wc.label = label
                    wc.abstract_count = len(ids)
                    wc.save(update_fields=['label', 'abstract_count', 'updated_at'])
                objs[norm] = wc

            wc_ids = [wc.id for wc in objs.values()]
            Through.objects.filter(woscategory_id__in=wc_ids).delete()
            links = [
                Through(woscategory_id=objs[norm].id, abstract_id=aid)
                for norm, ids in keep.items()
                for aid in ids
            ]
            Through.objects.bulk_create(links, batch_size=5000)

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} created, {len(keep) - created_count} updated, '
            f'{len(links)} category-abstract links.'
        ))
