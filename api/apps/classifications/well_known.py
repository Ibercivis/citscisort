"""
Public, unauthenticated view serving the project stats snapshot at
``/.well-known/stats.json`` per the cross-project "stats standard v1.0".

Deliberately a plain Django view (not DRF): the project's global DRF settings
require authentication + legal acceptance, and this endpoint must be world-
readable with no SDK. A plain view also lets us set the exact response headers
the standard mandates.
"""
import json

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_http_methods

from apps.classifications.stats import build_stats, read_snapshot


@require_http_methods(["GET", "HEAD"])
@cache_control(public=True, max_age=3600)
def stats_json(request):
    """
    Serve the daily snapshot if present, else compute live as a fallback.

    Always returns 200 with a JSON body and ``Access-Control-Allow-Origin: *``
    so any web dashboard can poll it cross-origin.
    """
    data = read_snapshot()
    if data is None:
        # Snapshot not generated yet (e.g. scheduler hasn't run on a fresh
        # deploy) — compute live so the endpoint is never empty.
        data = build_stats()

    response = HttpResponse(
        json.dumps(data, ensure_ascii=False, indent=2),
        content_type='application/json',
    )
    response['Access-Control-Allow-Origin'] = '*'
    return response
