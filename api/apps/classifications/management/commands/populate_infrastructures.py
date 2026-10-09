from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.classifications.models import Infrastructure


CANONICAL_INFRASTRUCTURES = [
    {'name': 'iNaturalist', 'type': 'platform', 'url': 'https://www.inaturalist.org',
     'icon': 'Pets', 'aliases': ['inat', 'inaturalist.org'],
     'description': 'Global biodiversity observation platform.'},
    {'name': 'Zooniverse', 'type': 'platform', 'url': 'https://www.zooniverse.org',
     'icon': 'Public', 'aliases': ['zooniverse.org'],
     'description': 'Umbrella platform for people-powered research projects.'},
    {'name': 'eBird', 'type': 'platform', 'url': 'https://ebird.org',
     'icon': 'FlutterDash', 'aliases': ['e-bird', 'ebird.org'],
     'description': 'Global bird observation platform by Cornell Lab of Ornithology.'},
    {'name': 'GBIF', 'type': 'database', 'url': 'https://www.gbif.org',
     'icon': 'Storage', 'aliases': ['gbif.org', 'Global Biodiversity Information Facility'],
     'description': 'Global Biodiversity Information Facility — aggregator of occurrence data.'},
    {'name': 'GLOBE Observer', 'type': 'platform', 'url': 'https://observer.globe.gov',
     'icon': 'Explore', 'aliases': ['GLOBE', 'globe.gov'],
     'description': 'NASA-funded global environmental observation programme.'},
    {'name': 'Pl@ntNet', 'type': 'app', 'url': 'https://plantnet.org',
     'icon': 'LocalFlorist', 'aliases': ['PlantNet', 'plantnet.org'],
     'description': 'Plant identification app using image recognition and community validation.'},
    {'name': 'Merlin Bird ID', 'type': 'app', 'url': 'https://merlin.allaboutbirds.org',
     'icon': 'PhoneAndroid', 'aliases': ['Merlin'],
     'description': 'Bird identification app by Cornell Lab of Ornithology.'},
    {'name': 'CoCoRaHS', 'type': 'network', 'url': 'https://www.cocorahs.org',
     'icon': 'WaterDrop', 'aliases': ['cocorahs.org'],
     'description': 'Community Collaborative Rain, Hail and Snow Network.'},
    {'name': 'Foldit', 'type': 'tool', 'url': 'https://fold.it',
     'icon': 'Extension', 'aliases': ['fold.it'],
     'description': 'Protein-folding puzzle game used for scientific research.'},
    {'name': 'EyeWire', 'type': 'tool', 'url': 'https://eyewire.org',
     'icon': 'RemoveRedEye', 'aliases': ['eyewire.org'],
     'description': 'Game for mapping neurons in the retina.'},
    {'name': 'SciStarter', 'type': 'platform', 'url': 'https://scistarter.org',
     'icon': 'Hub', 'aliases': ['scistarter.org'],
     'description': 'Hub of citizen science projects, tools and community.'},
    {'name': 'CitSci.org', 'type': 'platform', 'url': 'https://citsci.org',
     'icon': 'Science', 'aliases': ['citsci'],
     'description': 'Platform for building and managing citizen-science projects.'},
    {'name': 'BirdWeather', 'type': 'platform', 'url': 'https://www.birdweather.com',
     'icon': 'Cloud', 'aliases': ['birdweather.com'],
     'description': 'Acoustic bird-monitoring network (PUC devices).'},
    {'name': 'mPING', 'type': 'network', 'url': 'https://mping.ou.edu',
     'icon': 'Thunderstorm', 'aliases': ['mping.ou.edu'],
     'description': 'Meteorological Phenomena Identification Near the Ground (NSSL/OU).'},
    {'name': 'iRecord', 'type': 'app', 'url': 'https://irecord.org.uk',
     'icon': 'PhotoCamera', 'aliases': ['irecord.org.uk'],
     'description': 'UK biological recording platform by BRC/CEH.'},
]


class Command(BaseCommand):
    help = 'Populate the Infrastructure catalog with canonical citizen-science platforms, apps, and tools'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Delete existing seeded (is_verified=True) entries before populating')

    def handle(self, *args, **options):
        if options['reset']:
            n = Infrastructure.objects.filter(is_verified=True).delete()[0]
            self.stdout.write(f'Deleted {n} verified entries.')

        created = 0
        updated = 0
        for item in CANONICAL_INFRASTRUCTURES:
            obj, was_created = Infrastructure.objects.update_or_create(
                name=item['name'],
                defaults={
                    'slug': slugify(item['name']),
                    'url': item.get('url', ''),
                    'type': item['type'],
                    'description': item.get('description', ''),
                    'icon': item.get('icon', ''),
                    'aliases': item.get('aliases', []),
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

        total = Infrastructure.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Done. Created {created}, updated {updated}. Total in catalog: {total}.'
        ))
