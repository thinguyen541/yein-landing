#!/usr/bin/env bash
# Daily MySQL backup (installed as a cron job by deploy-vps.sh). Keeps the last 7 days.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=/root/yein-backups
mkdir -p "$DIR"
FILE="$DIR/yein-$(date +%F).sql.gz"
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' | gzip > "$FILE"
find "$DIR" -name 'yein-*.sql.gz' -mtime +7 -delete
echo "Backup: $FILE"
