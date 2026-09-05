#!/bin/sh
set -eu

ROOT="/home/u398929082/domains/visio.homosapiens.id/public_html"
BACKUP="/home/u398929082/visio-production-backup-$(date -u +%Y%m%dT%H%M%SZ).tgz"
ARCHIVE="https://codeload.github.com/homosapiens-id/visio-web/tar.gz/refs/heads/main"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

mkdir -p "$ROOT"
tar -czf "$BACKUP" -C "$ROOT" . 2>/dev/null || true

curl -fsSL "$ARCHIVE" | tar -xz -C "$TMPDIR"
SRC="$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d -name 'visio-web-*' | head -n 1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/index.html" ] || [ ! -f "$SRC/app/index.html" ]; then
  echo "VISIO_DEPLOY_INVALID_SOURCE" >&2
  exit 1
fi

find "$ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$SRC"/. "$ROOT"/
find "$ROOT" -type f -exec chmod 644 {} +
find "$ROOT" -type d -exec chmod 755 {} +

echo "VISIO_PRODUCTION_DEPLOY_OK source=visio-web/main backup=$BACKUP"
