from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.db.models import F
from django.contrib.auth import get_user_model
from .models import (
    Classification, UserProfile, DebateComment, Notification, Infrastructure,
    MetaAspectSuggestion, AbstractDebate
)
from apps.abstracts.models import Abstract

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Auto-create UserProfile when a new user is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when user is saved"""
    if hasattr(instance, 'classification_profile'):
        instance.classification_profile.save()


@receiver(post_save, sender=Classification)
def update_classification_counts(sender, instance, created, **kwargs):
    """Update counts when a classification is created"""
    if created:
        # Update abstract classification count
        abstract = instance.abstract
        abstract.current_classifications_count = abstract.classifications.filter(is_valid=True).count()
        
        # Check if consensus is reached
        if abstract.current_classifications_count >= abstract.required_classifications:
            abstract.consensus_reached = True
        
        abstract.save()
        
        # Update user profile total classifications
        profile = instance.user.classification_profile
        profile.total_classifications = instance.user.user_classifications.filter(is_valid=True).count()
        profile.save()


@receiver(m2m_changed, sender=Classification.infrastructures.through)
def update_infrastructure_usage_count(sender, instance, action, pk_set, **kwargs):
    """Keep Infrastructure.usage_count in sync with the M2M table."""
    if action == 'post_add' and pk_set:
        Infrastructure.objects.filter(pk__in=pk_set).update(usage_count=F('usage_count') + 1)
    elif action == 'post_remove' and pk_set:
        Infrastructure.objects.filter(pk__in=pk_set).update(usage_count=F('usage_count') - 1)
    elif action == 'pre_clear':
        current_ids = list(instance.infrastructures.values_list('pk', flat=True))
        if current_ids:
            Infrastructure.objects.filter(pk__in=current_ids).update(usage_count=F('usage_count') - 1)


@receiver(m2m_changed, sender=Classification.other_meta_aspects.through)
def update_meta_aspect_suggestion_usage_count(sender, instance, action, pk_set, **kwargs):
    """Keep MetaAspectSuggestion.usage_count in sync with the M2M table."""
    if action == 'post_add' and pk_set:
        MetaAspectSuggestion.objects.filter(pk__in=pk_set).update(usage_count=F('usage_count') + 1)
    elif action == 'post_remove' and pk_set:
        MetaAspectSuggestion.objects.filter(pk__in=pk_set).update(usage_count=F('usage_count') - 1)
    elif action == 'pre_clear':
        current_ids = list(instance.other_meta_aspects.values_list('pk', flat=True))
        if current_ids:
            MetaAspectSuggestion.objects.filter(pk__in=current_ids).update(usage_count=F('usage_count') - 1)


@receiver(post_save, sender=AbstractDebate)
def notify_classifiers_on_new_debate(sender, instance, created, **kwargs):
    """
    When a new debate is opened on an abstract, notify every user who has
    classified that abstract (except the debate initiator themselves).
    """
    if not created:
        return

    debate = instance
    abstract = debate.abstract
    initiator = debate.initiator

    title_preview = abstract.title[:50]
    if len(abstract.title) > 50:
        title_preview += '...'

    classifier_ids = Classification.objects.filter(
        abstract=abstract, user__isnull=False
    ).exclude(user=initiator).values_list('user_id', flat=True).distinct()

    to_create = [
        Notification(
            user_id=uid,
            actor=initiator,
            debate=debate,
            notification_type='debate_on_my_abstract',
            message=f'{initiator.username} opened a debate on "{title_preview}"',
        )
        for uid in classifier_ids
    ]
    Notification.objects.bulk_create(to_create)
