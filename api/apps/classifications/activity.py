"""
Per-user activity summary: classifications made today and the day streak.

Days are calendar days in ``settings.TIME_ZONE`` (Europe/Madrid), never UTC.
Only valid, non-training classifications count. The streak is the number of
consecutive days with at least one such classification, ending today — or
ending yesterday if the person has not classified yet today, so the streak
stays alive until the day is over. No grace days.

See docs/STREAK_AND_DAILY_COUNT_PLAN.md.
"""
from datetime import timedelta

from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import Classification


def _counted(user):
    return Classification.objects.filter(user=user, is_valid=True, is_training=False)


def _streaks(days, today):
    """``days``: set of dates with activity. Returns ``(current, best)``."""
    if not days:
        return 0, 0

    anchor = today if today in days else today - timedelta(days=1)
    current = 0
    day = anchor
    while day in days:
        current += 1
        day -= timedelta(days=1)

    best = run = 0
    previous = None
    for day in sorted(days):
        run = run + 1 if previous and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return current, best


def activity_summary(user, now=None):
    """
    ``{'today': int, 'streak_days': int, 'best_streak_days': int}``.

    ``streak_days`` is 0 once a full day has been missed.
    """
    tz = timezone.get_current_timezone()
    today = timezone.localtime(now or timezone.now(), tz).date()

    qs = _counted(user)
    days = set(
        qs.annotate(day=TruncDate('created_at', tzinfo=tz))
        .values_list('day', flat=True)
        .order_by()
        .distinct()
    )
    current, best = _streaks(days, today)
    today_count = qs.annotate(day=TruncDate('created_at', tzinfo=tz)).filter(day=today).count()
    return {
        'today': today_count,
        'streak_days': current,
        'best_streak_days': best,
    }
