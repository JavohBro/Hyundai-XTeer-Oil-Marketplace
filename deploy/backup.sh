#!/usr/bin/env bash
# Nightly backup of the database and uploaded product photos.
# Install:  sudo crontab -e   →   0 3 * * * /opt/oilbot/deploy/backup.sh
set -euo pipefail

APP_DIR="/opt/oilbot"
DEST="$APP_DIR/backups"
KEEP_DAYS=30
STAMP="$(date +%F_%H%M)"

mkdir -p "$DEST"

# .backup produces a consistent copy even while the app is writing.
# Copying the .db file directly can capture a torn write.
sqlite3 "$APP_DIR/oil_bot.db" ".backup '$DEST/db_$STAMP.db'"
gzip -f "$DEST/db_$STAMP.db"

# Photos: incremental mirror, so this stays fast as the catalogue grows
if [ -d "$APP_DIR/public/uploads" ]; then
  rsync -a --delete "$APP_DIR/public/uploads/" "$DEST/uploads/"
fi

# Prune old database snapshots
find "$DEST" -name 'db_*.db.gz' -mtime +$KEEP_DAYS -delete

echo "[$(date -Is)] backup ok -> $DEST/db_$STAMP.db.gz"
