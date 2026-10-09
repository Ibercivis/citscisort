# CitSciSort

Classification platform for citizen-science literature.

| Folder | What it is |
|---|---|
| `api/` | Django REST backend (see `api/README.md`; copy `api/.env.example` to `api/.env`) |
| `react-code/` | React + Vite frontend source |
| `frontend/` | **Not versioned.** Build output served by nginx, written by `react-code/deploy.sh` |

Deploy the frontend (on the server): `cd react-code && ./deploy.sh` (`--dry-run` to preview).
