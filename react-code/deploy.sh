#!/bin/bash
set -euo pipefail

# Build the frontend and deploy it into ../frontend (relative to this script).
# Runs locally on the server. Usage: ./deploy.sh [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)/frontend"

# Guard: never --delete into anything that is not a directory called "frontend".
if [ "$(basename "${TARGET_DIR}")" != "frontend" ] || [ "${TARGET_DIR}" = "/frontend" ]; then
  echo "Refusing to deploy: unexpected target ${TARGET_DIR}" >&2
  exit 1
fi

RSYNC_OPTS=(-av --delete --exclude='._*')
if [ "${1:-}" = "--dry-run" ]; then
  RSYNC_OPTS+=(--dry-run)
fi

cd "${SCRIPT_DIR}"

echo "Building..."
npm run build

# Guard: an empty/failed build must not wipe the live site.
if [ ! -s dist/index.html ] || [ ! -d dist/assets ]; then
  echo "Refusing to deploy: dist/index.html or dist/assets missing" >&2
  exit 1
fi

echo "Deploying to ${TARGET_DIR}..."
mkdir -p "${TARGET_DIR}"
rsync "${RSYNC_OPTS[@]}" dist/ "${TARGET_DIR}/"

if [ "${1:-}" = "--dry-run" ]; then
  echo "Dry run: nothing changed."
  exit 0
fi

if command -v nginx >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
  echo "Reloading nginx..."
  sudo systemctl reload nginx
fi

echo "Deploy complete."
