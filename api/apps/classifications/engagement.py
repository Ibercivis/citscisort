"""
Engagement email policy: who gets a reminder/congratulations email, and when.

Phase 1 covers two families (see docs/ENGAGEMENT_EMAILS.md for the full policy
and the phases still to come):

* **Milestone** — the person just crossed one of ``MILESTONES`` classifications.
* **Re-engagement** — signed up but never classified, or classified and then
  stopped. A short, fixed schedule of attempts, then silence for good.

Rules that apply to every email, enforced here and nowhere else:

* Only active accounts with a verified address and ``activity_emails_opt_in``.
* At most one engagement email per person every ``COOLDOWN_DAYS``.
* Every send (or failed attempt) is logged as an ``EngagementEmail`` row keyed
  by ``(user, dedupe_key)``, which is also how we avoid sending twice.
* Nothing is sent unless ``settings.ENGAGEMENT_EMAILS_ENABLED`` is true (or the
  caller forces it); dry runs are always allowed.

Entry point: :func:`run`. The daily RQ job (``jobs.send_engagement_emails``)
and the management command both go through it.
"""
import logging
from dataclasses import dataclass, field
from datetime import timedelta
from email import charset as email_charset

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.db.models import Max
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone

from apps.abstracts.models import Abstract
from .models import Classification, EngagementEmail, UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()

UNSUBSCRIBE_SALT = 'citscisort.engagement.unsubscribe'

TEMPLATES = {
    EngagementEmail.TYPE_MILESTONE: 'emails/milestone/milestone',
    EngagementEmail.TYPE_REENGAGEMENT_NEVER: 'emails/reengagement/reengagement',
    EngagementEmail.TYPE_REENGAGEMENT_LAPSED: 'emails/reengagement/reengagement',
}


def _cfg(key):
    return settings.ENGAGEMENT_EMAILS[key]


@dataclass
class Candidate:
    """One email the policy has decided to send."""
    user: object
    email_type: str
    dedupe_key: str
    payload: dict = field(default_factory=dict)

    @property
    def template_prefix(self):
        return TEMPLATES[self.email_type]


# --------------------------------------------------------------------------
# Unsubscribe tokens
# --------------------------------------------------------------------------

def make_unsubscribe_token(user):
    """Signed, non-expiring token identifying the user (no login needed)."""
    return signing.dumps({'u': user.pk}, salt=UNSUBSCRIBE_SALT)


def read_unsubscribe_token(token):
    """Return the user id in ``token`` or raise ``signing.BadSignature``."""
    return signing.loads(token, salt=UNSUBSCRIBE_SALT)['u']


def unsubscribe_url(user):
    path = reverse('engagement-unsubscribe', kwargs={'token': make_unsubscribe_token(user)})
    return f"{settings.API_PUBLIC_URL}{path}"


# --------------------------------------------------------------------------
# Eligibility
# --------------------------------------------------------------------------

def last_sent_at(user):
    return (
        EngagementEmail.objects
        .filter(user=user, status=EngagementEmail.STATUS_SENT)
        .aggregate(last=Max('created_at'))['last']
    )


def ineligibility_reason(user, profile, now):
    """Why this person must NOT be emailed right now, or ``None`` if they may."""
    if not user.is_active:
        return 'inactive account'
    if not user.email:
        return 'no email address'
    if not profile.activity_emails_opt_in:
        return 'opted out'
    if not EmailAddress.objects.filter(user=user, email__iexact=user.email, verified=True).exists():
        return 'email not verified'
    last = last_sent_at(user)
    if last and last > now - timedelta(days=_cfg('COOLDOWN_DAYS')):
        return f'cooldown (last email {last:%Y-%m-%d})'
    return None


def _last_classification_at(user):
    return (
        Classification.objects
        .filter(user=user, is_valid=True)
        .aggregate(last=Max('created_at'))['last']
    )


def _already_sent(user, dedupe_key):
    return EngagementEmail.objects.filter(
        user=user, dedupe_key=dedupe_key, status=EngagementEmail.STATUS_SENT
    ).first()


# --------------------------------------------------------------------------
# Triggers
# --------------------------------------------------------------------------

def milestone_candidate(user, profile, now):
    """
    Highest milestone the person has reached, if it is recent and unsent.

    Only the highest counts: someone at 45 gets "25", and later "50". A
    milestone is "recent" when their last classification is within
    MILESTONE_RECENCY_DAYS — so switching this on never congratulates people
    for things they did months ago.
    """
    count = profile.total_classifications
    reached = [m for m in _cfg('MILESTONES') if count >= m]
    if not reached:
        return None
    milestone = max(reached)

    last = _last_classification_at(user)
    if last is None or last < now - timedelta(days=_cfg('MILESTONE_RECENCY_DAYS')):
        return None

    sent_milestones = [
        row.payload.get('milestone', 0)
        for row in EngagementEmail.objects.filter(
            user=user, email_type=EngagementEmail.TYPE_MILESTONE,
            status=EngagementEmail.STATUS_SENT,
        )
    ]
    if sent_milestones and max(sent_milestones) >= milestone:
        return None

    return Candidate(
        user=user,
        email_type=EngagementEmail.TYPE_MILESTONE,
        dedupe_key=f'milestone:{milestone}',
        payload={
            'milestone': milestone,
            'user_classifications': count,
            'last_classification_at': last.isoformat(),
        },
    )


def reengagement_candidate(user, profile, now):
    """
    Next re-engagement attempt due for this person, if any.

    The schedule is a list of day thresholds measured from a reference date:
    sign-up for people who never classified, last classification for people
    who lapsed. Attempt *n* is due once the threshold has passed AND the
    previous attempt went out at least (threshold_n - threshold_{n-1}) days
    ago — so a long-inactive person still gets the attempts spaced out
    instead of back to back. Once all attempts are sent, nothing more.

    A lapsed person who classifies again gets a fresh reference date, hence
    a fresh dedupe prefix and a fresh cycle.
    """
    count = profile.total_classifications
    if count == 0:
        reference = user.date_joined
        schedule = _cfg('NEVER_CLASSIFIED_ATTEMPT_DAYS')
        email_type = EngagementEmail.TYPE_REENGAGEMENT_NEVER
        prefix = 'reengagement:never'
    else:
        reference = _last_classification_at(user)
        if reference is None:  # count > 0 but no valid rows: counters out of sync
            return None
        schedule = _cfg('LAPSED_ATTEMPT_DAYS')
        email_type = EngagementEmail.TYPE_REENGAGEMENT_LAPSED
        prefix = f'reengagement:lapsed:{reference:%Y-%m-%d}'

    days_inactive = (now - reference).days
    previous_sent_at = None
    for attempt, threshold in enumerate(schedule, start=1):
        key = f'{prefix}:{attempt}'
        row = _already_sent(user, key)
        if row:
            previous_sent_at = row.created_at
            continue
        if days_inactive < threshold:
            return None
        if attempt > 1:
            gap = threshold - schedule[attempt - 2]
            # calendar days, so a daily job firing at the same hour is not off by seconds
            if (now.date() - previous_sent_at.date()).days < gap:
                return None
        return Candidate(
            user=user,
            email_type=email_type,
            dedupe_key=key,
            payload={
                'attempt': attempt,
                'days_inactive': days_inactive,
                'reference_date': reference.isoformat(),
                'user_classifications': count,
            },
        )
    return None


def candidate_for(user, profile, now):
    """Milestones win over re-engagement when both apply (they rarely do)."""
    return milestone_candidate(user, profile, now) or reengagement_candidate(user, profile, now)


def collect_candidates(now=None, users=None):
    """
    Walk every profile and return the list of emails due today, plus a list
    of ``(user, reason)`` for people skipped by eligibility rules.
    """
    now = now or timezone.now()
    profiles = UserProfile.objects.select_related('user').order_by('user_id')
    if users is not None:
        profiles = profiles.filter(user__in=users)

    candidates, skipped = [], []
    for profile in profiles:
        user = profile.user
        reason = ineligibility_reason(user, profile, now)
        if reason:
            skipped.append((user, reason))
            continue
        candidate = candidate_for(user, profile, now)
        if candidate:
            candidates.append(candidate)
    candidates.sort(key=_priority)
    return candidates, skipped


def _priority(candidate):
    """
    Send order when there are more candidates than MAX_PER_RUN allows:
    milestones first (they are time-sensitive), then re-engagement with the
    most recently active people first (warmest leads). Ties by user id so the
    order is stable across runs.
    """
    is_milestone = candidate.email_type == EngagementEmail.TYPE_MILESTONE
    return (0 if is_milestone else 1, candidate.payload.get('days_inactive', 0), candidate.user.pk)


# --------------------------------------------------------------------------
# Rendering + sending
# --------------------------------------------------------------------------

def community_context():
    """Project-wide numbers shared by every template."""
    frontend = settings.FRONTEND_URL.rstrip('/')
    return {
        'site_name': settings.SITE_NAME,
        'frontend_url': frontend,
        'challenges_url': f'{frontend}/challenges',
        'total_classifications': Classification.objects.filter(is_valid=True, is_training=False).count(),
        'active_users': UserProfile.objects.filter(total_classifications__gte=1).count(),
        'total_abstracts': Abstract.objects.filter(is_active=True, consensus_reached=False).count(),
    }


def build_context(candidate, community=None, unsubscribe=None):
    """
    Template context. ``unsubscribe`` is the one-click URL; callers that also
    put it in a header pass it in so the same (timestamped) token is used
    everywhere in the message.
    """
    user = candidate.user
    profile = user.classification_profile
    ctx = dict(community or community_context())
    ctx.update(candidate.payload)
    ctx.update({
        'user': user,
        'first_name': profile.first_name or user.first_name or '',
        'user_classifications': profile.total_classifications,
        'unsubscribe_url': unsubscribe or unsubscribe_url(user),
    })
    return ctx


def render_email(candidate, community=None, unsubscribe=None):
    """Return ``(subject, text_body, html_body)`` for a candidate."""
    ctx = build_context(candidate, community, unsubscribe)
    prefix = candidate.template_prefix
    subject = ' '.join(render_to_string(f'{prefix}_subject.txt', ctx).split())
    text = render_to_string(f'{prefix}_message.txt', ctx)
    html = render_to_string(f'{prefix}_message.html', ctx)
    return subject, text, html


def send_candidate(candidate, community=None):
    """
    Send one email and log the outcome. Returns the ``EngagementEmail`` row.

    A failed send is logged with ``status='failed'`` and the error text; since
    failed rows do not count as sent, the next run retries it (and overwrites
    the same row on success thanks to the unique key).
    """
    user = candidate.user
    unsub = unsubscribe_url(user)
    subject, text, html = render_email(candidate, community, unsubscribe=unsub)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
        headers={
            # RFC 8058 one-click unsubscribe (Gmail/Yahoo require it for bulk senders)
            'List-Unsubscribe': f'<{unsub}>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
    )
    message.attach_alternative(html, 'text/html')
    # django_ses serialises with as_string(), which crashes on 8bit-encoded
    # non-ASCII bodies (accents, Cyrillic names). Quoted-printable is pure ASCII.
    qp_utf8 = email_charset.Charset('utf-8')
    qp_utf8.body_encoding = email_charset.QP
    message.encoding = qp_utf8

    status, error = EngagementEmail.STATUS_SENT, ''
    try:
        message.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001 - we want to log whatever SES throws
        status, error = EngagementEmail.STATUS_FAILED, f'{type(exc).__name__}: {exc}'
        logger.exception('Engagement email failed for user %s (%s)', user.pk, candidate.dedupe_key)

    row, _ = EngagementEmail.objects.update_or_create(
        user=user,
        dedupe_key=candidate.dedupe_key,
        defaults={
            'email_type': candidate.email_type,
            'recipient_email': user.email,
            'subject': subject,
            'status': status,
            'error': error,
            'payload': candidate.payload,
        },
    )
    return row


def run(dry_run=False, limit=None, users=None, force=False, now=None):
    """
    Decide and (unless ``dry_run``) send today's engagement emails.

    Returns a summary dict::

        {'enabled': bool, 'dry_run': bool,
         'candidates': [Candidate, ...],      # what this run sends (<= MAX_PER_RUN / limit)
         'deferred': [Candidate, ...],        # due but over the cap; later runs pick them up
         'skipped': [(user, reason), ...],
         'sent': int, 'failed': int}
    """
    enabled = settings.ENGAGEMENT_EMAILS_ENABLED or force
    candidates, skipped = collect_candidates(now=now, users=users)
    cap = _cfg('MAX_PER_RUN') if limit is None else limit
    deferred = candidates[cap:] if cap is not None else []
    candidates = candidates[:cap] if cap is not None else candidates

    summary = {
        'enabled': enabled, 'dry_run': dry_run,
        'candidates': candidates, 'skipped': skipped,
        'deferred': deferred,  # due, but over today's cap; picked up on later runs
        'sent': 0, 'failed': 0,
    }
    if dry_run:
        return summary
    if not enabled:
        logger.info('Engagement emails disabled (ENGAGEMENT_EMAILS_ENABLED=False); '
                    '%d candidate(s) not sent', len(candidates))
        return summary

    community = community_context()
    for candidate in candidates:
        row = send_candidate(candidate, community)
        summary['sent' if row.status == EngagementEmail.STATUS_SENT else 'failed'] += 1
    logger.info('Engagement emails: %d sent, %d failed, %d skipped',
                summary['sent'], summary['failed'], len(skipped))
    return summary
