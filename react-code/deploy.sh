#!/bin/bash
# Build the frontend and deploy it into ../frontend (relative to this script).
# Runs locally on the server.
#
#   ./deploy.sh              build, swap into ../frontend, reload nginx, verify
#   ./deploy.sh --dry-run    build and show what would change; touch nothing live
#   ./deploy.sh --force      deploy even with uncommitted changes in react-code/
#   ./deploy.sh --rollback   put the previous deploy (../frontend.prev) back
#
# Deploys are atomic-ish: the new build is staged in ../frontend.new and swapped
# in with two renames, the old one is kept in ../frontend.prev, and a failed
# post-deploy check rolls back automatically. Every run is logged to deploy.log.
# Env: DEPLOY_CHECK_URL (default https://citscisort.ibercivis.es/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_DIR="${PARENT_DIR}/frontend"
NEW_DIR="${PARENT_DIR}/frontend.new"
PREV_DIR="${PARENT_DIR}/frontend.prev"
LOG_FILE="${SCRIPT_DIR}/deploy.log"
CHECK_URL="${DEPLOY_CHECK_URL:-https://citscisort.ibercivis.es/}"

MODE=deploy
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)  MODE=dry-run ;;
    --rollback) MODE=rollback ;;
    --force)    FORCE=1 ;;
    -h|--help)  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }

# --- Guards: only ever touch frontend / frontend.new / frontend.prev -----------
[ "$(basename "${TARGET_DIR}")" = "frontend" ] || die "unexpected target ${TARGET_DIR}"
case "${PARENT_DIR}" in
  /|"${HOME}") die "refusing to operate in ${PARENT_DIR}" ;;
esac
case "${SCRIPT_DIR}/" in
  "${TARGET_DIR}/"*|"${NEW_DIR}/"*|"${PREV_DIR}/"*) die "script must not live inside the deploy directories" ;;
esac

# --- Helpers ------------------------------------------------------------------
log_line() { # result, version
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$MODE" "${2:-?}" \
    "$(git -C "${SCRIPT_DIR}" rev-parse --short HEAD 2>/dev/null || echo '?')" \
    "${USER:-$(id -un)}" "$1" >> "${LOG_FILE}"
}

reload_nginx() {
  if command -v nginx >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
    echo "Reloading nginx..."
    sudo -n systemctl reload nginx || echo "WARN: could not reload nginx (static files are served anyway)" >&2
  fi
}

# The site must answer 200 and reference the same JS bundle as ../frontend/index.html.
verify_site() {
  local bundle body
  bundle="$(grep -o 'assets/index-[^"]*\.js' "${TARGET_DIR}/index.html" | head -1)"
  [ -n "${bundle}" ] || return 1
  body="$(curl -fsS --max-time 20 -H 'Cache-Control: no-cache' "${CHECK_URL}")" || return 1
  grep -q "${bundle}" <<<"${body}"
}

swap_in() { # make $1 the live directory, keep the old live one at PREV_DIR
  rm -rf "${PREV_DIR}"
  if [ -d "${TARGET_DIR}" ]; then mv -T "${TARGET_DIR}" "${PREV_DIR}"; fi
  mv -T "$1" "${TARGET_DIR}"
}

restore_prev() {
  [ -d "${PREV_DIR}" ] || die "no previous deploy at ${PREV_DIR}"
  local tmp="${PARENT_DIR}/frontend.swap"
  rm -rf "${tmp}"
  mv -T "${TARGET_DIR}" "${tmp}"
  mv -T "${PREV_DIR}" "${TARGET_DIR}"
  mv -T "${tmp}" "${PREV_DIR}"          # the rolled-back build stays available
}

# --- Rollback -----------------------------------------------------------------
if [ "$MODE" = rollback ]; then
  echo "Rolling back ${TARGET_DIR} to ${PREV_DIR}..."
  restore_prev
  reload_nginx
  if verify_site; then echo "Rollback complete."; log_line OK "rollback"
  else echo "WARN: site check failed after rollback" >&2; log_line CHECK_FAILED "rollback"; exit 1; fi
  exit 0
fi

# --- Node (Vite 7 needs >= 20.19; the system node is older) --------------------
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt 20 ] && [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"; nvm use 22 >/dev/null
fi
[ "$(node_major)" -ge 20 ] || die "Node >= 20.19 required (install with nvm)"

cd "${SCRIPT_DIR}"

# --- Only deploy committed code ------------------------------------------------
if [ -n "$(git status --porcelain -- . 2>/dev/null)" ]; then
  if [ "$MODE" = deploy ] && [ "$FORCE" -eq 0 ]; then
    git status --short -- . >&2
    die "uncommitted changes in react-code/ (commit them, or use --force)"
  fi
  echo "WARN: uncommitted changes; the version will be marked -dirty" >&2
fi

# --- Build --------------------------------------------------------------------
echo "Building..."
npm run build

[ -s dist/index.html ] && [ -d dist/assets ] || die "dist/index.html or dist/assets missing; refusing to deploy"
VERSION="$(git describe --tags --always --dirty 2>/dev/null || echo unknown)"
echo "Built version: ${VERSION} (commit $(git rev-parse --short HEAD))"

# --- Dry run ------------------------------------------------------------------
if [ "$MODE" = dry-run ]; then
  echo "Changes that a deploy to ${TARGET_DIR} would make:"
  rsync -rcn --delete --exclude='._*' --itemize-changes dist/ "${TARGET_DIR}/" | grep -v '^\.d' || true
  echo "Dry run: nothing changed."
  exit 0
fi

# --- Stage, swap, reload, verify -----------------------------------------------
echo "Staging in ${NEW_DIR}..."
rm -rf "${NEW_DIR}"
mkdir -p "${NEW_DIR}"
rsync -a --exclude='._*' dist/ "${NEW_DIR}/"
chmod -R a+rX "${NEW_DIR}"
[ -s "${NEW_DIR}/index.html" ] || die "staged build is empty"

echo "Swapping into ${TARGET_DIR} (previous kept in ${PREV_DIR})..."
swap_in "${NEW_DIR}"
reload_nginx

echo "Checking ${CHECK_URL} ..."
if verify_site; then
  echo "Deploy complete: ${VERSION}"
  log_line OK "${VERSION}"
else
  echo "Site check FAILED; rolling back." >&2
  if [ -d "${PREV_DIR}" ]; then restore_prev; reload_nginx; log_line "CHECK_FAILED_ROLLED_BACK" "${VERSION}"
  else log_line "CHECK_FAILED_NO_PREV" "${VERSION}"; fi
  exit 1
fi
