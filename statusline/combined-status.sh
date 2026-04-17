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

# ── Capture stdin from Claude Code ──────────────────────────────────────────
STDIN_DATA=$(cat)

# ── Parse rate-limit fields ──────────────────────────────────────────────────
STATS_JSON=$(printf '%s\n' "$STDIN_DATA" | python3 -c "
import json, sys, datetime

def fmt_session_reset(ts):
    if not ts: return '--'
    diff = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc) - datetime.datetime.now(datetime.timezone.utc)
    mins = max(0, int(diff.total_seconds() / 60))
    h, m = mins // 60, mins % 60
    return f'{h}h{m:02d}m' if h else f'{m}m'

def fmt_weekly_reset(ts):
    if not ts: return '--'
    diff = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc) - datetime.datetime.now(datetime.timezone.utc)
    secs = max(0, int(diff.total_seconds()))
    d = secs // 86400
    h = (secs % 86400) // 3600
    m = (secs % 3600) // 60
    return f'{d}d{h:02d}h' if d else (f'{h}h{m:02d}m' if h else f'{m}m')

try:
    data = json.load(sys.stdin)
    rl = data.get('rate_limits', {})
    fh = rl.get('five_hour', {})
    sd = rl.get('seven_day', {})
    sess_pct = fh.get('used_percentage')
    week_pct = sd.get('used_percentage')
    print(json.dumps({
        'sess_pct': sess_pct,
        'sess_reset': fmt_session_reset(fh.get('resets_at')),
        'week_pct': week_pct,
        'week_reset': fmt_weekly_reset(sd.get('resets_at')),
        'has_data': sess_pct is not None or week_pct is not None,
    }))
except Exception:
    print('{}')
" 2>/dev/null)
