#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/.logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# Stop any stale processes first (best effort)
if [[ -f "$ROOT_DIR/stop.sh" ]]; then
  bash "$ROOT_DIR/stop.sh" >/dev/null 2>&1 || true
fi

PY_CMD="python"
if command -v python3 >/dev/null 2>&1; then
  PY_CMD="python3"
fi

start_service() {
  local name="$1"
  local workdir="$2"
  local cmd="$3"
  local logfile="$LOG_DIR/${name}.log"
  local pidfile="$PID_DIR/${name}.pid"

  echo "Starting $name..."
  (
    cd "$workdir"
    bash -lc "$cmd"
  ) >"$logfile" 2>&1 &

  local pid=$!
  echo "$pid" >"$pidfile"

  sleep 2
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "$name started (pid: $pid)"
  else
    echo "$name failed to start. Last log lines:"
    tail -n 40 "$logfile" || true
    exit 1
  fi
}

start_service "ml-service" "$ROOT_DIR/ml-service" "$PY_CMD app/main.py"
start_service "backend" "$ROOT_DIR/backend" "npm run dev"
start_service "frontend" "$ROOT_DIR/frontend" "npm run dev"

echo ""
echo "All services started."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "ML API:   http://localhost:8001"
echo ""
echo "Logs: $LOG_DIR"
echo "Stop all: bash ./stop.sh"
