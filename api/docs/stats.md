# Public project stats (`/.well-known/stats.json`)

CitSciSort exposes a public, read-only, machine-readable metrics document that
any external dashboard can poll with a plain `GET`, no auth and no SDK. It
implements the cross-project **stats standard v1.0**.

## Endpoint

```
GET https://citscisort-api.ibercivis.es/.well-known/stats.json
```

- Served by this API (Django). `project.url` inside the document points at the
  public **frontend** (`https://citscisort.ibercivis.es`), not at the API.
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *`
- `Cache-Control: public, max-age=3600`
- Always returns `200` — it is a snapshot, not real time.

## Document format (schema v1.0)

```json
{
  "schema_version": "1.0",
  "project": {
    "id": "citscisort",
    "name": "CitSciSort",
    "url": "https://citscisort.ibercivis.es"
  },
  "generated_at": "2026-05-30T00:00:00+00:00",
  "metrics": {
    "participants": 107
  }
}
```

`metrics` is an append-only bag: keys are only ever added, never renamed or
reused.

## Metric definitions (canonical)

| Key | Definition |
|---|---|
| `participants` | Registered, **active** user accounts (`is_active = True`). This is the platform's "registered users" population. |

The definition lives in code in `apps/classifications/stats.py::_participants()` —
that function is the single source of truth. If it changes, update this table.

## How it is generated

- A daily RQ-Scheduler cron job (`00:00 UTC`) runs
  `apps.classifications.jobs.generate_stats_snapshot`, which writes the snapshot
  **atomically** to `media/stats.json` (`PROJECT_STATS_SNAPSHOT_PATH`).
- The view serves that file. If it does not exist yet (e.g. fresh deploy before
  the first run), it computes the stats live as a fallback, so the endpoint is
  never empty.

Operational details (supervisor programs, registering the cron job) are in
`deploy/supervisor/README.md`.

## Configuration

Environment variables (see `.env.example`):

| Var | Default | Meaning |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/5` | Redis backing the RQ queue/scheduler. citscisort owns db5 on the shared instance — see note below. |
| `PROJECT_STATS_ID` | `citscisort` | Stable short id for the project. |
| `PROJECT_STATS_NAME` | `CitSciSort` | Human-readable name. |
| `PROJECT_STATS_URL` | `https://citscisort.ibercivis.es` | Public project site (frontend). |
| `PROJECT_STATS_SNAPSHOT_PATH` | `media/stats.json` | Where the snapshot file is written. |

## Registering with an external dashboard

Hand the dashboard maintainer:

- `project.id`: `citscisort`
- URL: `https://citscisort-api.ibercivis.es/.well-known/stats.json`
