#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

: "${FTP_HOST:?Missing FTP_HOST}"
: "${FTP_USER:?Missing FTP_USER}"
: "${FTP_PASS:?Missing FTP_PASS}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/}"

if [ ! -d "dist" ]; then
  echo "dist/ not found. Run pnpm build first."
  exit 1
fi

LFTP_BIN="${LFTP_BIN:-$(command -v lftp || true)}"

if [ -z "${LFTP_BIN}" ]; then
  echo "lftp is required. Install with: brew install lftp"
  exit 1
fi

if ! "${LFTP_BIN}" --version >/dev/null 2>&1; then
  echo "lftp could not execute: ${LFTP_BIN}" >&2
  echo "Install a native lftp binary for this machine, or set LFTP_BIN to its path." >&2
  exit 1
fi

"${LFTP_BIN}" -u "${FTP_USER}","${FTP_PASS}" "sftp://${FTP_HOST}" <<EOF
set sftp:auto-confirm yes
mirror -R --delete --verbose dist "${FTP_REMOTE_DIR}"
quit
EOF
