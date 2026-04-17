#!/usr/bin/env bash
# statusline/combined-status.sh
# Two-panel status line: rate-limit stats left, buddy art right.
# buddy-status.sh is intentionally untouched (kept clean for upstream PR).

[ "$BUDDY_SHELL" = "1" ] && exit 0

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
BUDDY_SCRIPT="$SCRIPT_DIR/buddy-status.sh"

if ! command -v python3 >/dev/null 2>&1; then
    exec "$BUDDY_SCRIPT"
fi
