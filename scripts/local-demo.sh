#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API_PORT="${API_PORT:-8000}"
ADMIN_API_PORT="${ADMIN_API_PORT:-5001}"
ADMIN_UI_PORT="${ADMIN_UI_PORT:-3000}"
CLIENT_API_URL="${CLIENT_API_URL:-http://localhost:${API_PORT}}"
ANDROID_API_URL="${ANDROID_API_URL:-http://10.0.2.2:${API_PORT}}"
MODE="${1:-all}"

require_path() {
  if [ ! -e "$1" ]; then
    echo "Missing required path: $1" >&2
    exit 1
  fi
}

run_api() {
  require_path "$ROOT_DIR/.venv/bin/python"
  cd "$ROOT_DIR/server"
  echo "Starting FastAPI on http://localhost:${API_PORT}"
  NODE_ENV=development HOST=0.0.0.0 PORT="$API_PORT" \
    "$ROOT_DIR/.venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port "$API_PORT" --reload
}

run_admin_api() {
  require_path "$ROOT_DIR/admin/server/node_modules"
  cd "$ROOT_DIR/admin/server"
  echo "Starting admin API on http://localhost:${ADMIN_API_PORT}"
  NODE_ENV=development PORT="$ADMIN_API_PORT" npm start
}

run_admin_ui() {
  require_path "$ROOT_DIR/admin/node_modules"
  cd "$ROOT_DIR/admin"
  echo "Starting admin UI on http://localhost:${ADMIN_UI_PORT}"
  PORT="$ADMIN_UI_PORT" BROWSER=none REACT_APP_API_URL="http://localhost:${ADMIN_API_PORT}/api" npm start
}

run_client_web() {
  require_path "$ROOT_DIR/client/node_modules"
  cd "$ROOT_DIR/client"
  echo "Starting Expo web with API ${CLIENT_API_URL}"
  EXPO_PUBLIC_API_URL="$CLIENT_API_URL" npm run web -- --clear
}

run_client() {
  require_path "$ROOT_DIR/client/node_modules"
  cd "$ROOT_DIR/client"
  echo "Starting Expo with API ${CLIENT_API_URL}"
  EXPO_PUBLIC_API_URL="$CLIENT_API_URL" npm start -- --host lan --clear
}

run_android() {
  require_path "$ROOT_DIR/client/node_modules"
  cd "$ROOT_DIR/client"
  echo "Starting Expo Android with API ${ANDROID_API_URL}"
  EXPO_PUBLIC_API_URL="$ANDROID_API_URL" npm run android -- --clear
}

case "$MODE" in
  api)
    run_api
    ;;
  admin-api)
    run_admin_api
    ;;
  admin-ui)
    run_admin_ui
    ;;
  client-web)
    run_client_web
    ;;
  client)
    run_client
    ;;
  android)
    run_android
    ;;
  all)
    run_api &
    api_pid=$!
    run_admin_api &
    admin_api_pid=$!
    run_admin_ui &
    admin_ui_pid=$!
    run_client_web &
    client_pid=$!

    cleanup() {
      kill "$api_pid" "$admin_api_pid" "$admin_ui_pid" "$client_pid" 2>/dev/null || true
    }
    trap cleanup EXIT INT TERM
    wait "$api_pid" "$admin_api_pid" "$admin_ui_pid" "$client_pid"
    ;;
  *)
    echo "Usage: $0 [all|api|admin-api|admin-ui|client-web|client|android]" >&2
    exit 1
    ;;
esac
