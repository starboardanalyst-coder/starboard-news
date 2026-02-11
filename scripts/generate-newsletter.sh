#!/bin/bash
# Starboard News - Local newsletter generator
# Uses Claude Code CLI to generate content, then pushes via ingest API
#
# Usage: ./generate-newsletter.sh [type]
#   type: minor_news | into_crypto_cn | into_crypto_en | all (default: all)
#
# Prompts are loaded from scripts/prompts/*.txt — edit those files to customize.
# Secrets are loaded from scripts/.env (gitignored).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_DIR="${SCRIPT_DIR}/prompts"
ENV_FILE="${SCRIPT_DIR}/.env"

# Load secrets from .env
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing ${ENV_FILE}"
  echo "Create it with:"
  echo "  API_URL=https://news.starboard.to"
  echo "  CRON_SECRET=your-secret-here"
  exit 1
fi
source "$ENV_FILE"

: "${API_URL:?API_URL not set in .env}"
: "${CRON_SECRET:?CRON_SECRET not set in .env}"

TODAY=$(date +%Y-%m-%d)

generate_and_ingest() {
  local type="$1"
  local prompt_file="${PROMPT_DIR}/${type}.txt"
  local system_file="${PROMPT_DIR}/system.txt"

  if [ ! -f "$prompt_file" ]; then
    echo "[$type] ERROR: Prompt file not found: $prompt_file"
    return 1
  fi

  echo "[$type] Generating content for $TODAY..."

  # Check if content already exists
  local check
  check=$(curl -s "${API_URL}/api/content/today?feed=${type}")
  if echo "$check" | grep -q '"date"'; then
    echo "[$type] Content already exists for today, skipping."
    return 0
  fi

  # Load prompt template and replace {{DATE}}
  local prompt
  prompt=$(sed "s/{{DATE}}/${TODAY}/g" "$prompt_file")

  # Load system prompt
  local system_prompt=""
  if [ -f "$system_file" ]; then
    system_prompt=$(cat "$system_file")
  fi

  # Generate content via Claude Code CLI
  local content
  if [ -n "$system_prompt" ]; then
    content=$(claude -p --system-prompt "$system_prompt" "$prompt" 2>/dev/null)
  else
    content=$(claude -p "$prompt" 2>/dev/null)
  fi

  if [ -z "$content" ]; then
    echo "[$type] ERROR: Claude returned empty content"
    return 1
  fi

  echo "[$type] Generated $(echo "$content" | wc -c | tr -d ' ') chars"

  # Push to ingest API
  local payload
  payload=$(jq -n \
    --arg type "$type" \
    --arg date "$TODAY" \
    --arg content "$content" \
    '{type: $type, date: $date, content: $content}')

  local resp
  resp=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/content/ingest" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local http_code
  http_code=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')

  if [ "$http_code" = "200" ]; then
    echo "[$type] Ingested successfully."
  else
    echo "[$type] ERROR: Ingest failed (HTTP $http_code): $body"
    return 1
  fi
}

# --- Main ---

TYPE="${1:-all}"

echo "=== Starboard Newsletter Generator ==="
echo "Date: $TODAY"
echo "Prompts: $PROMPT_DIR"
echo ""

# Pull latest prompts from git
if git -C "$SCRIPT_DIR/.." rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Pulling latest from git..."
  git -C "$SCRIPT_DIR/.." pull --ff-only 2>/dev/null && echo "Git pull OK" || echo "Git pull skipped (no remote or conflicts)"
  echo ""
fi

TYPES=()
case "$TYPE" in
  minor_news|into_crypto_cn|into_crypto_en)
    TYPES=("$TYPE")
    ;;
  all)
    TYPES=(minor_news into_crypto_cn into_crypto_en)
    ;;
  *)
    echo "Unknown type: $TYPE"
    echo "Usage: $0 [minor_news|into_crypto_cn|into_crypto_en|all]"
    exit 1
    ;;
esac

FAILED=0
for t in "${TYPES[@]}"; do
  generate_and_ingest "$t" || FAILED=$((FAILED + 1))
  echo ""
done

# --- Backup subscribers ---
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-subscribers.sh"
if [ -x "$BACKUP_SCRIPT" ]; then
  echo "--- Running subscriber backup ---"
  "$BACKUP_SCRIPT" || echo "WARNING: Backup failed (non-fatal)"
  echo ""
fi

echo "=== Done (${#TYPES[@]} types, $FAILED failed) ==="
exit $FAILED
