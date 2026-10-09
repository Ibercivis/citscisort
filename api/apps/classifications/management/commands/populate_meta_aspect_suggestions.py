from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.classifications.models import MetaAspectSuggestion


# Initial meta-aspect suggestions. Selected so that each one is:
# - legitimate in the CS meta-research literature
# - NOT covered by any of the 7 canonical aspects (methodology, data quality,
#   participation, impact, technology, ethics, theory) on a 1:1 basis
# - broad enough to be re-usable across many papers
CANONICAL_SUGGESTIONS = [
    {'name': 'FAIR data principles',
     'description': 'Findable, Accessible, Interoperable, Reusable data practices.'},
    {'name': 'Open Science practices',
     'description': 'Open-access publishing, open code, pre-registration, open peer review.'},
    {'name': 'Co-design / Co-creation',
     'description': 'Projects where participants co-design the research questions and protocols with scientists.'},
    {'name': 'Indigenous & local knowledge',
     'description': 'Integration of Indigenous, traditional, or local knowledge systems.'},
    {'name': 'Gender & diversity perspectives',
     'description': 'Gender dimension and demographic diversity in citizen science (RRI key missing from the 7 canonical).'},
    {'name': 'Science communication',
     'description': 'Communicating science to the public, storytelling, media strategy.'},
    {'name': 'Policy engagement',
     'description': 'Citizen science in support of public policy, advocacy, decision-making.'},
    {'name': 'Interdisciplinarity',
     'description': 'Cross-disciplinary methodological transfer and collaboration.'},
]


class Command(BaseCommand):
    help = 'Populate the MetaAspectSuggestion catalog with seeded canonical entries'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Delete existing verified entries before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            n = MetaAspectSuggestion.objects.filter(is_verified=True).delete()[0]
            self.stdout.write(f'Deleted {n} verified entries.')

        created = 0
        updated = 0
        for item in CANONICAL_SUGGESTIONS:
            obj, was_created = MetaAspectSuggestion.objects.update_or_create(
                name=item['name'],
                defaults={
                    'slug': slugify(item['name']),
                    'description': item.get('description', ''),
                    'is_verified': True,
                    'is_active': True,
                    'created_by': None,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(f'  Created: {obj.name}')
            else:
                updated += 1
                self.stdout.write(f'  Updated: {obj.name}')

        total = MetaAspectSuggestion.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Done. Created {created}, updated {updated}. Total: {total}.'
        ))
