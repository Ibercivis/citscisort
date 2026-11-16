"""
Token authentication that also records "this user was here today".

Writes at most one DailyActivity row per user per calendar day (settings.TIME_ZONE).
A per-process cache key keeps the hot path to a cache lookup; recording failures
never affect authentication. See docs/DAILY_ACTIVITY.md.
"""
import logging

from django.core.cache import cache
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication

logger = logging.getLogger(__name__)


def record_daily_activity(user):
    from .models import DailyActivity

    today = timezone.localdate()
    key = f'daily-activity:{user.pk}:{today.isoformat()}'
    if cache.get(key):
        return
    DailyActivity.objects.get_or_create(user=user, date=today)
    cache.set(key, 1, 60 * 60 * 26)


class ActivityTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            try:
                record_daily_activity(result[0])
            except Exception:  # never break a request over bookkeeping
                logger.exception('Could not record daily activity')
        return result
