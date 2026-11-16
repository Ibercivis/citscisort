"""Staff-only views. See docs/DAILY_ACTIVITY.md."""
from datetime import timedelta

from django.db.models import Count, Min
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Classification, DailyActivity, EngagementEmail

MAX_DAYS = 365


class DailyActivityView(APIView):
    """GET /api/staff/daily-activity/?days=60 — who was active each day."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get('days', 60)), MAX_DAYS))
        except ValueError:
            days = 60
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        rows = (DailyActivity.objects.filter(date__gte=start)
                .select_related('user').order_by('date', 'first_seen_at'))
        counts = {
            (r['user'], r['day']): r['n']
            for r in Classification.objects
            .filter(user__isnull=False, created_at__date__gte=start)
            .annotate(day=TruncDate('created_at'))
            .values('user', 'day').annotate(n=Count('id'))
        }

        by_day = {}
        for row in rows:
            u = row.user
            by_day.setdefault(row.date, []).append({
                'id': u.id,
                'name': u.get_full_name().strip() or u.username,
                'username': u.username,
                'classifications': counts.get((u.id, row.date), 0),
                'first_seen_at': row.first_seen_at,
            })

        result = []
        for i in range(days):
            d = start + timedelta(days=i)
            users = by_day.get(d, [])
            result.append({'date': d, 'active_count': len(users), 'users': users})

        since = DailyActivity.objects.aggregate(m=Min('date'))['m']
        return Response({
            'days': days,
            'tracking_since': since,
            'timezone': timezone.get_current_timezone_name(),
            'results': result,
        })


def email_sends(today, window=7):
    """Every batch of emails we sent (all time), with what its recipients did in
    the ``window`` days before and after. A batch = one newsletter, or one day
    of reminder/milestone emails. Correlation only: there is no control group.
    """
    groups = {}
    rows = (EngagementEmail.objects.filter(status=EngagementEmail.STATUS_SENT, user__isnull=False)
            .values_list('user_id', 'email_type', 'dedupe_key', 'created_at'))
    for user_id, email_type, key, created in rows:
        day = timezone.localtime(created).date()
        if email_type == EngagementEmail.TYPE_NEWSLETTER:
            gid, kind, label = (key, day), 'newsletter', key.split(':', 1)[-1]
        else:
            gid, kind, label = ('reminders', day), 'reminders', 'Reminders and milestones'
        g = groups.setdefault(gid, {'date': day, 'kind': kind, 'label': label, 'users': set()})
        g['users'].add(user_id)

    counted = Classification.objects.filter(is_valid=True, is_training=False)
    result = []
    for g in sorted(groups.values(), key=lambda x: x['date']):
        d, users = g['date'], g['users']
        after_end = d + timedelta(days=window - 1)          # send day counts as day 1 "after"

        def classifiers(start, end):
            return (counted.filter(user_id__in=users, created_at__date__gte=start, created_at__date__lte=end)
                    .values('user_id').distinct().count())

        def classifications(start, end):
            return counted.filter(user_id__in=users, created_at__date__gte=start, created_at__date__lte=end).count()

        result.append({
            'date': d,
            'kind': g['kind'],
            'label': g['label'],
            'sent': len(users),
            'window_days': window,
            'days_elapsed': min((today - d).days + 1, window),
            'window_complete': today >= after_end,
            'classified_before': classifiers(d - timedelta(days=window), d - timedelta(days=1)),
            'classified_after': classifiers(d, after_end),
            'classifications_before': classifications(d - timedelta(days=window), d - timedelta(days=1)),
            'classifications_after': classifications(d, after_end),
            # Only meaningful for sends after daily-activity logging started.
            'active_after': (DailyActivity.objects.filter(user_id__in=users, date__gte=d, date__lte=after_end)
                             .values('user_id').distinct().count()),
        })
    return result


class StaffOverviewView(APIView):
    """GET /api/staff/overview/?days=60 — aggregated numbers for the staff charts.

    Only aggregates, never lists of people. Classifications = valid, non-training,
    counted per calendar day in settings.TIME_ZONE.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import F, Sum
        from apps.abstracts.models import Abstract

        User = get_user_model()
        try:
            days = max(1, min(int(request.query_params.get('days', 60)), MAX_DAYS))
        except ValueError:
            days = 60
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        def daily(qs, field):
            return {r['day']: r['n'] for r in
                    qs.annotate(day=TruncDate(field)).values('day').annotate(n=Count('id'))}

        counted = Classification.objects.filter(is_valid=True, is_training=False)
        per_day = daily(counted.filter(created_at__date__gte=start), 'created_at')
        signups = daily(User.objects.filter(date_joined__date__gte=start), 'date_joined')
        users_before = User.objects.filter(date_joined__date__lt=start).count()

        series, cumulative = [], users_before
        for i in range(days):
            d = start + timedelta(days=i)
            cumulative += signups.get(d, 0)
            series.append({
                'date': d,
                'classifications': per_day.get(d, 0),
                'signups': signups.get(d, 0),
                'users_total': cumulative,
            })

        # Progress: regular (non-gold) active abstracts still needing classifications.
        pool = Abstract.objects.filter(is_active=True, is_gold_standard=False)
        total = pool.count()
        pending = pool.filter(consensus_reached=False,
                              current_classifications_count__lt=F('required_classifications'))
        remaining_abstracts = pending.count()
        remaining_classifications = pending.aggregate(
            n=Sum(F('required_classifications') - F('current_classifications_count')))['n'] or 0
        required_total = pool.aggregate(n=Sum('required_classifications'))['n'] or 0
        buckets = {}
        for r in pool.values('current_classifications_count').annotate(n=Count('id')):
            k = min(r['current_classifications_count'], 5)
            buckets[k] = buckets.get(k, 0) + r['n']
        histogram = [{'classifications': k, 'abstracts': buckets.get(k, 0)} for k in range(6)]

        # Pace = average per day over the selected range (zero days count).
        pace = sum(d['classifications'] for d in series) / days
        eta_days = round(remaining_classifications / pace) if pace > 0 else None

        # Funnel (all time).
        per_user = {r['user']: r['n'] for r in
                    counted.filter(user__isnull=False).values('user').annotate(n=Count('id'))}
        funnel = [
            {'step': 'Registered', 'users': User.objects.count()},
            {'step': 'Logged in', 'users': User.objects.filter(last_login__isnull=False).count()},
            {'step': '1+ classification', 'users': sum(1 for n in per_user.values() if n >= 1)},
            {'step': '10+ classifications', 'users': sum(1 for n in per_user.values() if n >= 10)},
        ]

        return Response({
            'days': days,
            'series': series,
            'progress': {
                'abstracts_total': total,
                'abstracts_remaining': remaining_abstracts,
                'classifications_required': required_total,
                'classifications_remaining': remaining_classifications,
                'histogram': histogram,
                'pace_per_day': round(pace, 1),
                'pace_window_days': days,
                'eta_days': eta_days,
            },
            'funnel': funnel,
            'email_sends': email_sends(today),
            'activity_tracking_since': DailyActivity.objects.aggregate(m=Min('date'))['m'],
        })
