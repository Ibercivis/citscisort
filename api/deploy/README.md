# Deploy: RQ worker + scheduler (supervisord)

Background jobs run on the RQ queue **`citscisort_scheduler`** (Redis; use a
dedicated Redis database via `REDIS_URL`, because rq-scheduler keeps its scheduled
jobs under a single non-namespaced key per database). Two long-running
processes are managed by supervisord:

| Program | Role |
|---|---|
| `citscisort-rq-worker` | Executes enqueued jobs (e.g. regenerating the stats snapshot). |
| `citscisort-rq-scheduler` | Polls rq-scheduler and enqueues recurring cron jobs when due. |

Both rely on `REDIS_URL` in `.env` (defaults to `redis://localhost:6379/5`).
citscisort owns **db5** on the shared Redis instance: rq-scheduler stores all
scheduled jobs under one non-namespaced key per DB, so a shared DB lets other
projects' restarts wipe this project's scheduled jobs. Isolate by DB number, not
by queue name. The gunicorn web process also enqueues jobs, so it must run with
the same `REDIS_URL` — restart it alongside the worker/scheduler on any change.

## Install

```bash
sudo cp deploy/supervisor/citscisort-rq.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status | grep citscisort
```

## Register the recurring stats job

The cron entry lives in Redis, not in the supervisor config. Register it once
(idempotent, safe to re-run on every deploy):

```bash
.venv/bin/python manage.py schedule_stats            # daily at 00:00 UTC
.venv/bin/python manage.py schedule_stats --now      # + run once immediately
```

## Check status / logs

```bash
sudo supervisorctl status citscisort-rq-worker citscisort-rq-scheduler
tail -f /var/log/citscisort-rq-worker.out.log
```

The Django-admin-gated RQ dashboard is available at `/django-rq/`.

## Smoke test without supervisor

```bash
.venv/bin/python manage.py write_stats_snapshot                   # generate snapshot directly
.venv/bin/python manage.py rqworker citscisort_scheduler --burst  # drain queue once
curl -s https://citscisort-api.ibercivis.es/.well-known/stats.json
```
