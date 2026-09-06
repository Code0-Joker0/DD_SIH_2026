#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
PIDFILE="$LOG_DIR/vllm.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if [[ -r "/proc/$PID/cmdline" ]] && tr '\0' ' ' < "/proc/$PID/cmdline" | grep -q 'vllm serve'; then
    kill "$PID" 2>/dev/null || echo "process $PID already stopped"
  else
    echo "PID file does not reference a vLLM process; refusing to kill PID $PID" >&2
  fi
  rm -f "$PIDFILE"
  echo "vLLM stopped - GPU memory released."
else
  echo "No PID file at $PIDFILE - is vLLM running under this script?"
fi
