"""
One-off newsletter sends to people with ``UserProfile.newsletter_opt_in``.

Content lives in ``docs/newsletters/<slug>.html`` / ``.txt`` (body only; the
frame is ``templates/emails/newsletter/``). Every send is logged in
``EngagementEmail`` (type ``newsletter``, dedupe key ``newsletter:<slug>``), so
re-running the same slug never emails anyone twice and failed sends are retried.
Logged newsletters also count for the reminders' 7-day cooldown.
"""
from email import charset as email_charset
from pathlib import Path

from allauth.account.models import EmailAddress
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .engagement import unsubscribe_url
from .models import EngagementEmail, UserProfile

CONTENT_DIR = Path(settings.BASE_DIR) / 'docs' / 'newsletters'
REPLY_TO = 'info@ibercivis.es'


def dedupe_key(slug):
    return f'newsletter:{slug}'


def load_content(slug):
    return ((CONTENT_DIR / f'{slug}.html').read_text(encoding='utf-8'),
            (CONTENT_DIR / f'{slug}.txt').read_text(encoding='utf-8'))


def recipients(slug, only_emails=None):
    """Return ``(to_send, skipped)``; ``skipped`` is a list of ``(profile, reason)``."""
    key = dedupe_key(slug)
    profiles = UserProfile.objects.filter(newsletter_opt_in=True).select_related('user').order_by('user_id')
    if only_emails:
        wanted = {e.lower() for e in only_emails}
        profiles = [p for p in profiles if (p.user.email or '').lower() in wanted]
    verified = set(EmailAddress.objects.filter(verified=True).values_list('user_id', 'email'))
    verified = {(uid, email.lower()) for uid, email in verified}
    already = set(EngagementEmail.objects.filter(dedupe_key=key, status=EngagementEmail.STATUS_SENT)
                  .values_list('user_id', flat=True))
    to_send, skipped = [], []
    for p in profiles:
        u = p.user
        if not u.is_active:
            skipped.append((p, 'inactive account'))
        elif not u.email:
            skipped.append((p, 'no email address'))
        elif (u.id, u.email.lower()) not in verified:
            skipped.append((p, 'email not verified'))
        elif u.id in already:
            skipped.append((p, 'already sent'))
        else:
            to_send.append(p)
    return to_send, skipped


def build_message(profile, slug, subject, body_html, body_text, subject_prefix=''):
    user = profile.user
    unsub_news = unsubscribe_url(user, 'newsletter')
    ctx = {
        'subject': subject,
        'first_name': profile.first_name or user.first_name or '',
        'site_name': settings.SITE_NAME,
        'frontend_url': settings.FRONTEND_URL.rstrip('/'),
        'unsubscribe_newsletter_url': unsub_news,
        'unsubscribe_all_url': unsubscribe_url(user, 'all'),
        'body_html': body_html,
        'body_text': body_text,
    }
    message = EmailMultiAlternatives(
        subject=subject_prefix + subject,
        body=render_to_string('emails/newsletter/newsletter_message.txt', ctx),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
        reply_to=[REPLY_TO],
        headers={
            'List-Unsubscribe': f'<{unsub_news}>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
    )
    message.attach_alternative(render_to_string('emails/newsletter/newsletter_message.html', ctx), 'text/html')
    qp_utf8 = email_charset.Charset('utf-8')   # same reason as engagement.send_candidate
    qp_utf8.body_encoding = email_charset.QP
    message.encoding = qp_utf8
    return message


def send_one(profile, slug, subject, body_html, body_text):
    """Send and log. Returns the ``EngagementEmail`` row."""
    user = profile.user
    status, error = EngagementEmail.STATUS_SENT, ''
    try:
        build_message(profile, slug, subject, body_html, body_text).send()
    except Exception as exc:  # log and carry on with the rest of the list
        status, error = EngagementEmail.STATUS_FAILED, str(exc)[:2000]
    row, _ = EngagementEmail.objects.update_or_create(
        user=user, dedupe_key=dedupe_key(slug),
        defaults={
            'email_type': EngagementEmail.TYPE_NEWSLETTER,
            'recipient_email': user.email,
            'subject': subject,
            'status': status,
            'error': error,
            'payload': {'slug': slug, 'consent_at': profile.newsletter_opt_in_at.isoformat()
                        if profile.newsletter_opt_in_at else None},
        },
    )
    return row
