#!/usr/bin/env bash
set -e

# Arguments: <bot_id> <display_num> <vnc_port> <ws_port> <config_json_path>
BOT_ID=${1:-1}
DISPLAY_NUM=${2:-101}
VNC_PORT=${3:-5901}
WS_PORT=${4:-6081}
CONFIG_PATH=${5:-"/tmp/vnc_bot_${BOT_ID}.json"}
PID_FILE="/tmp/vnc_bot_${BOT_ID}.pids"

# Clean up any prior processes for this bot/display
if [ -f "$PID_FILE" ]; then
  while read -r old_pid; do
    kill -9 "$old_pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi
rm -f "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}" 2>/dev/null || true

export DISPLAY=":${DISPLAY_NUM}"

echo "Starting Xvfb on :${DISPLAY_NUM}..."
Xvfb ":${DISPLAY_NUM}" -screen 0 1440x900x24 -ac &
XVFB_PID=$!
sleep 1

echo "Starting x11vnc on port ${VNC_PORT}..."
x11vnc -display ":${DISPLAY_NUM}" -rfbport "${VNC_PORT}" -forever -shared -nopw -quiet &
X11VNC_PID=$!
sleep 1

echo "Starting websockify on port ${WS_PORT}..."
websockify --web=/usr/share/novnc "${WS_PORT}" "localhost:${VNC_PORT}" &
WEBSOCKIFY_PID=$!
sleep 1

echo "Launching headed stealth Chromium for Bot ID ${BOT_ID}..."
python - "$CONFIG_PATH" <<'PYEOF' &
import json
import os
import sys
from playwright.sync_api import sync_playwright

cfg_path = sys.argv[1]
with open(cfg_path, 'r', encoding='utf-8') as f:
    cfg = json.load(f)

profile_path = cfg['profile_path']
os.makedirs(profile_path, exist_ok=True)
for lock_name in ('SingletonLock', 'SingletonCookie', 'SingletonSocket'):
    lp = os.path.join(profile_path, lock_name)
    if os.path.exists(lp) or os.path.islink(lp):
        try:
            os.remove(lp)
        except OSError:
            pass

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=profile_path,
        headless=False,
        viewport=cfg.get('viewport', {'width': 1440, 'height': 900}),
        user_agent=cfg.get('user_agent'),
        locale=cfg.get('locale', 'en-US'),
        timezone_id=cfg.get('timezone_id', 'America/New_York'),
        proxy=cfg.get('proxy'),
        ignore_default_args=['--enable-automation'],
        args=cfg.get('args', ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']),
        extra_http_headers=cfg.get('extra_http_headers', {}),
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    if cfg.get('stealth_js'):
        page.add_init_script(cfg['stealth_js'])
    try:
        page.goto(cfg['start_url'], wait_until='domcontentloaded', timeout=60000)
    except Exception as e:
        print(f"Navigation notice: {e}")
    print('Headed stealth browser ready for manual interaction.')
    try:
        page.wait_for_timeout(3600000)
    except Exception:
        pass
    try:
        ctx.close()
    except Exception:
        pass
PYEOF
BROWSER_PID=$!

echo "$XVFB_PID" > "$PID_FILE"
echo "$X11VNC_PID" >> "$PID_FILE"
echo "$WEBSOCKIFY_PID" >> "$PID_FILE"
echo "$BROWSER_PID" >> "$PID_FILE"

wait $BROWSER_PID || true
kill $WEBSOCKIFY_PID $X11VNC_PID $XVFB_PID 2>/dev/null || true
rm -f "$PID_FILE"
echo "Session closed cleanly."
