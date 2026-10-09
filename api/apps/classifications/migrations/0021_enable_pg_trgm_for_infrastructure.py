from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0020_remove_classification_infrastructure_and_more'),
    ]

    operations = [
        # Enable the pg_trgm PostgreSQL extension (idempotent).
        TrigramExtension(),

        # GIN index over name for fast trigram similarity search.
        migrations.AddIndex(
            model_name='infrastructure',
            index=GinIndex(
                fields=['name'],
                name='infrastructure_name_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ),
    ]
