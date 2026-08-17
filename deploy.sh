#!/bin/sh
set -eu
ROOT="/home/u398929082/domains/visio.homosapiens.id/public_html"
BACKUP="/home/u398929082/visio-production-backup-$(date -u +%Y%m%dT%H%M%SZ).tgz"
SOURCE="https://raw.githubusercontent.com/homosapiens-id/visio-static/main/index.html"
mkdir -p "$ROOT"
tar -czf "$BACKUP" -C "$ROOT" . 2>/dev/null || true
TMP="$ROOT/.visio-index.$$.html"
curl -fsSL "$SOURCE" -o "$TMP"
find "$ROOT" -mindepth 1 -maxdepth 1 ! -name "$(basename "$TMP")" -exec rm -rf {} +
mv "$TMP" "$ROOT/index.html"
chmod 644 "$ROOT/index.html"
echo "VISIO_PRODUCTION_DEPLOY_OK backup=$BACKUP"
