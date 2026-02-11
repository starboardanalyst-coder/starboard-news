#!/bin/bash
# Starboard News - Daily subscriber backup
# Downloads all active subscriptions as JSON and keeps 30 days of snapshots.
#
# Usage:
#   ./backup-subscribers.sh              # one-off backup
#   Add to cron alongside generate-newsletter.sh
#
# Requires scripts/.env with API_URL and CRON_SECRET

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
KEEP_DAYS=30

# Load secrets
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing ${ENV_FILE}"
  exit 1
fi
source "$ENV_FILE"

: "${API_URL:?API_URL not set}"
: "${CRON_SECRET:?CRON_SECRET not set}"

mkdir -p "$BACKUP_DIR"

TODAY=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/subscribers-${TODAY}.json"

echo "[backup] Exporting subscribers..."

HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${API_URL}/api/admin/export")

HTTP_CODE=$(echo "$HTTP_RESP" | tail -1)
BODY=$(echo "$HTTP_RESP" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "[backup] ERROR: Export failed (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

echo "$BODY" > "$BACKUP_FILE"

COUNT=$(echo "$BODY" | grep -o '"active_count":[0-9]*' | grep -o '[0-9]*')
echo "[backup] Saved ${COUNT} active subscribers → ${BACKUP_FILE}"

# Prune old backups
find "$BACKUP_DIR" -name "subscribers-*.json" -mtime +${KEEP_DAYS} -delete 2>/dev/null || true
REMAINING=$(find "$BACKUP_DIR" -name "subscribers-*.json" | wc -l | tr -d ' ')
echo "[backup] ${REMAINING} backup files retained (${KEEP_DAYS}-day window)"
