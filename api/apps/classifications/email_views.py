"""
One-click unsubscribe from engagement emails.

Plain Django view (not DRF) on purpose: it is reached from a link in an email
with no session, and mail clients honouring RFC 8058 send a bare POST with no
CSRF token. The signed token in the URL is the only credential; it never
expires, so a year-old email still works.
"""
from django.core import signing
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .engagement import read_unsubscribe_token
from .models import UserProfile


def _page(title, body):
    frontend = settings.FRONTEND_URL.rstrip('/')
    return HttpResponse(f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · {settings.SITE_NAME}</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#333;line-height:1.6}}
h1{{color:#2563eb;font-size:22px}} a{{color:#2563eb}}</style></head>
<body><h1>{title}</h1><p>{body}</p>
<p><a href="{frontend}/account">Manage your email preferences</a> · <a href="{frontend}">Back to {settings.SITE_NAME}</a></p>
</body></html>""")


@csrf_exempt
@require_http_methods(["GET", "POST"])
def unsubscribe(request, token):
    try:
        user_id = read_unsubscribe_token(token)
    except signing.BadSignature:
        return _page('Invalid link', 'This unsubscribe link is not valid.')

    updated = UserProfile.objects.filter(user_id=user_id, activity_emails_opt_in=True).update(
        activity_emails_opt_in=False,
        activity_emails_opt_out_at=timezone.now(),
    )
    if updated:
        body = ('You will no longer receive reminder or milestone emails from us. '
                'Account emails (password resets, things people share with you) are not affected.')
    else:
        body = 'You were already unsubscribed from reminder and milestone emails.'
    return _page('Unsubscribed', body)
