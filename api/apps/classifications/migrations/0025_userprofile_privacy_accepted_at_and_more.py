from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0024_alter_notification_notification_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='privacy_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='privacy_version_accepted',
            field=models.CharField(blank=True, default='', help_text='Version string of the Privacy Policy the user accepted', max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='terms_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='terms_version_accepted',
            field=models.CharField(blank=True, default='', help_text='Version string of the Terms of Service the user accepted', max_length=50),
        ),
    ]
