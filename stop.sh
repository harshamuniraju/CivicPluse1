#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_pid_file() {
  local name="$1"
  local pidfile="$PID_DIR/${name}.pid"

  if [[ ! -f "$pidfile" ]]; then
    echo "$name: not running (no pid file)"
    return 0
  fi

  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$pidfile"
    echo "$name: stale pid file removed"
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping $name (pid: $pid)..."
    kill "$pid" >/dev/null 2>&1 || true

    for _ in {1..10}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$name did not stop gracefully, force killing..."
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi

    # Windows fallback (Git Bash)
    if kill -0 "$pid" >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
      taskkill //PID "$pid" //F >/dev/null 2>&1 || true
    fi

    echo "$name stopped"
  else
    echo "$name: process already stopped"
  fi

  rm -f "$pidfile"
}

stop_pid_file "frontend"
stop_pid_file "backend"
stop_pid_file "ml-service"

echo "Done."
