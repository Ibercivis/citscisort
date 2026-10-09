"""
Public project stats snapshot — machine-readable metrics for external dashboards.

Implements the cross-project "stats standard v1.0": a single, public, read-only
JSON document that any dashboard can poll without authentication or an SDK, by
doing a plain GET to ``/.well-known/stats.json``.

The document is generated out-of-band (management command ``write_stats_snapshot``,
intended to run once a day from cron) and written atomically to disk. The public
view serves that file as-is; if the snapshot has not been generated yet it falls
back to computing the stats live.

See docs/stats.md for the canonical definition of each metric.
"""
import json
import os
import tempfile
from datetime import timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

# Bump only if we break the document format (per the standard).
SCHEMA_VERSION = "1.0"


def _snapshot_path():
    return settings.PROJECT_STATS_SNAPSHOT_PATH


def _participants():
    """
    Canonical participant count for CitSciSort.

    Definition: registered, active user accounts (``is_active=True``) — the same
    population the platform treats as "registered users". This function is the
    single source of truth for the definition; to switch to a stricter one
    (e.g. verified-email-only, or contributors with >=1 classification) change
    it here and keep docs/stats.md in sync.
    """
    User = get_user_model()
    return User.objects.filter(is_active=True).count()


def build_stats():
    """Compute the full stats document (schema v1.0) live from the database."""
    identity = settings.PROJECT_STATS_IDENTITY
    generated_at = timezone.now().astimezone(dt_timezone.utc).replace(microsecond=0)
    return {
        "schema_version": SCHEMA_VERSION,
        "project": {
            "id": identity["id"],
            "name": identity["name"],
            "url": identity["url"],
        },
        "generated_at": generated_at.isoformat(),
        "metrics": {
            # A bag that only grows — never rename or reuse an existing key.
            "participants": _participants(),
        },
    }


def write_snapshot():
    """
    Compute the stats and write them to disk atomically.

    Writes to a temporary file in the snapshot's own directory and then
    ``os.replace()``s it into place, so a reader never observes a half-written
    file. Returns the path written.
    """
    path = _snapshot_path()
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)

    payload = json.dumps(build_stats(), ensure_ascii=False, indent=2)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".stats-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
    return path


def read_snapshot():
    """Return the snapshot as a dict, or None if it has not been generated yet."""
    try:
        with open(_snapshot_path(), encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return None
