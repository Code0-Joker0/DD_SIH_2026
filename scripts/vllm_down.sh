#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
PIDFILE="$LOG_DIR/vllm.pid"

killed=0

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if [[ -r "/proc/$PID/cmdline" ]] && tr '\0' ' ' < "/proc/$PID/cmdline" | grep -q 'vllm serve'; then
    kill "$PID" 2>/dev/null || echo "process $PID already stopped"
    killed=1
  else
    echo "PID file does not reference a vLLM process (PID $PID); falling back to pkill." >&2
  fi
  rm -f "$PIDFILE"
fi

# Fallback: kill ANY remaining vllm serve processes (catches manually-started instances)
if pkill -f "vllm serve" 2>/dev/null; then
  killed=1
fi

if [[ $killed -eq 1 ]]; then
  # Give the GPU a moment to release memory
  sleep 2
  echo "vLLM stopped - GPU memory released."
else
  echo "No vLLM process found to stop."
fi
