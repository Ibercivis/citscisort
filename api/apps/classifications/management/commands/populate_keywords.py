"""
Normalize the free-text `Abstract.keywords` field into the `Keyword` table and
rebuild the Abstract<->Keyword M2M links.

`Abstract.keywords` is kept untouched (semicolon-delimited text, used for display
and import back-compat). This command derives the normalized, deduplicated view
that powers reliable filtering, exact counts and keyword Challenges — using the
same normalization as the keyword histogram (split on ';', lowercase, strip,
collapse whitespace, dedupe per article).

Idempotent: re-running upserts keywords (it never deletes Keyword rows, so it
won't cascade-delete keyword Challenges) and fully rebuilds the M2M links.
"""
from collections import Counter, defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.abstracts.models import Abstract
from apps.classifications.models import Keyword


def normalize_keyword(raw):
    """Canonical form for matching: lowercase, strip, collapse inner whitespace."""
    return ' '.join(raw.strip().lower().split())


class Command(BaseCommand):
    help = 'Normalize Abstract.keywords into the Keyword table and rebuild M2M links'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-count', type=int, default=1,
            help='Only keep keywords appearing in at least N abstracts (default: 1 = all)'
        )

    def handle(self, *args, **options):
        min_count = options['min_count']

        # Pass 1: aggregate from free text.
        spellings = defaultdict(Counter)   # norm -> Counter(original spelling)
        abstract_ids = defaultdict(set)    # norm -> {abstract_id}

        rows = Abstract.objects.exclude(keywords='').values_list('id', 'keywords')
        for aid, kw_text in rows.iterator():
            seen = set()  # dedupe within a single article (by normalized form)
            for raw in kw_text.split(';'):
                original = raw.strip()
                norm = normalize_keyword(original)
                if not norm or norm in seen:
                    continue
                seen.add(norm)
                spellings[norm][original] += 1
                abstract_ids[norm].add(aid)

        keep = {n: ids for n, ids in abstract_ids.items() if len(ids) >= min_count}
        self.stdout.write(
            f'Found {len(abstract_ids)} distinct keywords; '
            f'keeping {len(keep)} with >= {min_count} abstract(s).'
        )

        Through = Keyword.abstracts.through
        used_slugs = set(Keyword.objects.values_list('slug', flat=True))

        def unique_slug(norm):
            base = slugify(norm)[:260] or 'kw'
            slug, i = base, 2
            while slug in used_slugs:
                slug = f'{base}-{i}'
                i += 1
            used_slugs.add(slug)
            return slug

        created_count = 0
        keyword_objs = {}  # norm -> Keyword

        with transaction.atomic():
            for norm, ids in keep.items():
                label = spellings[norm].most_common(1)[0][0]
                kw, created = Keyword.objects.get_or_create(
                    name=norm,
                    defaults={'label': label, 'slug': unique_slug(norm),
                              'abstract_count': len(ids)},
                )
                if created:
                    created_count += 1
                else:
                    kw.label = label
                    kw.abstract_count = len(ids)
                    kw.save(update_fields=['label', 'abstract_count', 'updated_at'])
                keyword_objs[norm] = kw

            # Rebuild M2M links for the processed keywords only.
            kw_ids = [kw.id for kw in keyword_objs.values()]
            Through.objects.filter(keyword_id__in=kw_ids).delete()
            links = [
                Through(keyword_id=keyword_objs[norm].id, abstract_id=aid)
                for norm, ids in keep.items()
                for aid in ids
            ]
            Through.objects.bulk_create(links, batch_size=5000)

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} created, {len(keep) - created_count} updated, '
            f'{len(links)} keyword-abstract links.'
        ))
