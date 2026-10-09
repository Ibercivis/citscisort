"""
Background jobs run on the RQ ``citscisort_scheduler`` queue.

These are plain functions enqueued by rq-scheduler (recurring) or by hand. Keep
them importable by a fully-qualified path — that path is what gets stored in
Redis, so renaming/moving a job function orphans any already-scheduled entries
(re-run ``manage.py schedule_stats`` after such a change).
"""
import logging

from apps.classifications.stats import write_snapshot

logger = logging.getLogger(__name__)


def generate_stats_snapshot():
    """Regenerate the public stats snapshot (/.well-known/stats.json)."""
    path = write_snapshot()
    logger.info("Wrote public stats snapshot to %s", path)
    return path


def send_engagement_emails():
    """Daily: send due re-engagement / milestone emails (see engagement.py)."""
    from apps.classifications.engagement import run

    summary = run()
    logger.info(
        "Engagement emails job: enabled=%s sent=%d failed=%d candidates=%d skipped=%d",
        summary['enabled'], summary['sent'], summary['failed'],
        len(summary['candidates']), len(summary['skipped']),
    )
    return {k: summary[k] for k in ('enabled', 'sent', 'failed')}
