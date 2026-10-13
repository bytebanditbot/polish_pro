#!/bin/sh
# Runs inside the "backup" container of docker-compose.prod.yml.
# Every BACKUP_INTERVAL_HOURS it saves the database and the uploaded images to ./backups,
# and deletes backups older than BACKUP_KEEP_DAYS.
set -eu

BACKUP_DIR=/backups
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"

mkdir -p "$BACKUP_DIR"

while true; do
  STAMP="$(date +%Y-%m-%d_%H%M)"

  # Database (custom format: compressed, restore with pg_restore)
  if pg_dump -h db -U "$POSTGRES_USER" -Fc -f "$BACKUP_DIR/db_$STAMP.dump.tmp" "$POSTGRES_DB"; then
    mv "$BACKUP_DIR/db_$STAMP.dump.tmp" "$BACKUP_DIR/db_$STAMP.dump"
    echo "[$(date)] database saved: db_$STAMP.dump"
  else
    rm -f "$BACKUP_DIR/db_$STAMP.dump.tmp"
    echo "[$(date)] ERROR: database backup failed" >&2
  fi

  # Imported images
  if tar czf "$BACKUP_DIR/uploads_$STAMP.tar.gz.tmp" -C /uploads .; then
    mv "$BACKUP_DIR/uploads_$STAMP.tar.gz.tmp" "$BACKUP_DIR/uploads_$STAMP.tar.gz"
    echo "[$(date)] uploads saved: uploads_$STAMP.tar.gz"
  else
    rm -f "$BACKUP_DIR/uploads_$STAMP.tar.gz.tmp"
    echo "[$(date)] ERROR: uploads backup failed" >&2
  fi

  # Retention
  find "$BACKUP_DIR" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

  sleep "$((INTERVAL_HOURS * 3600))"
done
