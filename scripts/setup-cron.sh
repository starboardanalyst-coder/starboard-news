#!/bin/bash
# Starboard News - Cron Setup Script
# Run this on the machine that will generate newsletters daily.
#
# What this script does:
#   1. Checks all dependencies (claude CLI, curl, jq, git)
#   2. Clones the repo (or pulls if already cloned)
#   3. Creates scripts/.env with secrets
#   4. Verifies the generate script works
#   5. Sets up a daily cron job (7:00 UTC)
#
# Usage: bash setup-cron.sh

set -euo pipefail

REPO_URL="https://github.com/starboardanalyst-coder/starboard-news.git"
INSTALL_DIR="$HOME/starboard-news"
SCRIPT_PATH="${INSTALL_DIR}/scripts/generate-newsletter.sh"
ENV_FILE="${INSTALL_DIR}/scripts/.env"
LOG_FILE="$HOME/starboard-newsletter.log"
CRON_HOUR_UTC=7  # 7:00 UTC — emails send at 8:00 UTC via Vercel cron

echo "=== Starboard Newsletter Cron Setup ==="
echo ""

# --- Step 1: Check dependencies ---
echo "[1/6] Checking dependencies..."

MISSING=()

if ! command -v claude &>/dev/null; then
  MISSING+=("claude (Claude Code CLI — install: npm install -g @anthropic-ai/claude-code)")
fi

if ! command -v curl &>/dev/null; then
  MISSING+=("curl")
fi

if ! command -v jq &>/dev/null; then
  MISSING+=("jq (install: brew install jq  OR  apt install jq)")
fi

if ! command -v git &>/dev/null; then
  MISSING+=("git")
fi

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing dependencies:"
  for dep in "${MISSING[@]}"; do
    echo "  - $dep"
  done
  echo ""
  echo "Install them and re-run this script."
  exit 1
fi

echo "  All dependencies found."
echo ""

# --- Step 2: Clone or update repo ---
echo "[2/6] Setting up repo at $INSTALL_DIR..."

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "  Repo already exists, pulling latest..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "  Cloning repo..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

chmod +x "$SCRIPT_PATH"
echo "  Done."
echo ""

# --- Step 3: Create .env file ---
echo "[3/6] Configuring secrets..."

if [ -f "$ENV_FILE" ]; then
  echo "  .env already exists at $ENV_FILE"
  echo "  Current contents:"
  cat "$ENV_FILE" | sed 's/^/    /'
  echo ""
  read -p "  Overwrite? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  Keeping existing .env"
    echo ""
    goto_step4=true
  fi
fi

if [ ! -f "$ENV_FILE" ] || [ "${goto_step4:-}" != "true" ]; then
  echo "  Enter your CRON_SECRET (from Vercel env vars or .env.local):"
  read -r INPUT_SECRET
  cat > "$ENV_FILE" << EOF
API_URL=https://news.starboard.to
CRON_SECRET=${INPUT_SECRET}
EOF
  echo "  .env created at $ENV_FILE"
fi
echo ""

# --- Step 4: Verify API connectivity ---
echo "[4/6] Verifying API connectivity..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://news.starboard.to/api/newsletters")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  API reachable (HTTP $HTTP_CODE)"
else
  echo "  WARNING: API returned HTTP $HTTP_CODE — check if https://news.starboard.to is up"
fi
echo ""

# --- Step 5: Test Claude CLI ---
echo "[5/6] Testing Claude CLI..."

TEST_OUTPUT=$(claude -p "Say 'ready' and nothing else" 2>/dev/null || true)
if [ -n "$TEST_OUTPUT" ]; then
  echo "  Claude CLI works."
else
  echo "  WARNING: Claude CLI returned empty output. Make sure you're logged in."
  echo "  Run: claude  (to start interactive mode and authenticate)"
fi
echo ""

# --- Step 6: Set up cron ---
echo "[6/6] Setting up cron job..."

# Calculate local hour from UTC
LOCAL_OFFSET=$(date +%z | sed 's/\([+-]\)\([0-9][0-9]\)\([0-9][0-9]\)/\1\2/')
LOCAL_HOUR=$(( CRON_HOUR_UTC + ${LOCAL_OFFSET} ))
if [ $LOCAL_HOUR -lt 0 ]; then LOCAL_HOUR=$((LOCAL_HOUR + 24)); fi
if [ $LOCAL_HOUR -ge 24 ]; then LOCAL_HOUR=$((LOCAL_HOUR - 24)); fi

CRON_LINE="0 ${LOCAL_HOUR} * * * ${SCRIPT_PATH} all >> ${LOG_FILE} 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "generate-newsletter.sh"; then
  echo "  Cron job already exists:"
  crontab -l 2>/dev/null | grep "generate-newsletter"
  echo ""
  read -p "  Replace it? [y/N] " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    crontab -l 2>/dev/null | grep -v "generate-newsletter" | crontab -
  else
    echo "  Keeping existing cron job."
    echo ""
    echo "=== Setup Complete ==="
    exit 0
  fi
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "  Cron job added: $CRON_LINE"
echo "  (${LOCAL_HOUR}:00 local = ${CRON_HOUR_UTC}:00 UTC)"
echo "  Logs: $LOG_FILE"
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Quick reference:"
echo "  Test now:      ${SCRIPT_PATH} minor_news"
echo "  Edit prompts:  edit files in ${INSTALL_DIR}/scripts/prompts/"
echo "  Sync prompts:  cd ${INSTALL_DIR} && git pull"
echo "  Check logs:    tail -f ${LOG_FILE}"
echo "  Edit secrets:  nano ${ENV_FILE}"
