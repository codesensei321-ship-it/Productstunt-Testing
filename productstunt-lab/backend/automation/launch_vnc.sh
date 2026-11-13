#!/usr/bin/env bash
set -e

# Arguments: <bot_id> <display_num> <vnc_port> <ws_port> <profile_path> <start_url> <proxy_server>
BOT_ID=${1:-1}
DISPLAY_NUM=${2:-101}
VNC_PORT=${3:-5901}
WS_PORT=${4:-6081}
PROFILE_PATH=${5:-"/data/profiles/bot_001"}
START_URL=${6:-"https://staging.productstunt.com/signup"}
PROXY_SERVER=${7:-""}

export DISPLAY=":${DISPLAY_NUM}"

echo "Starting Xvfb on :${DISPLAY_NUM}..."
Xvfb ":${DISPLAY_NUM}" -screen 0 1280x800x24 -ac &
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

echo "Launching headed Chromium for Bot ID ${BOT_ID} pointing to ${START_URL}..."
python -c "
import sys
from playwright.sync_api import sync_playwright

proxy_dict = None
if '${PROXY_SERVER}':
    proxy_dict = {'server': '${PROXY_SERVER}'}

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir='${PROFILE_PATH}',
        headless=False,
        viewport={'width': 1280, 'height': 800},
        proxy=proxy_dict,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto('${START_URL}')
    print('Browser launched. Ready for human-in-the-loop interaction.')
    try:
        page.wait_for_timeout(3600000)
    except:
        pass
" &
BROWSER_PID=$!

wait $BROWSER_PID
kill $WEBSOCKIFY_PID $X11VNC_PID $XVFB_PID 2>/dev/null || true
echo "Session closed cleanly."
