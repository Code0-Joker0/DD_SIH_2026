#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

case "${1:-}" in
  up)
    ./scripts/qdrant_up.sh
    ./scripts/vllm_up.sh
    ;;
  down)
    ./scripts/vllm_down.sh
    ./scripts/qdrant_down.sh
    ;;
  status)
    docker ps --filter "name=${QDRANT_CONTAINER_NAME:-sih-qdrant}"
    curl -sf "http://localhost:${VLLM_PORT}/health" >/dev/null 2>&1 \
      && echo "vLLM: healthy on port $VLLM_PORT" \
      || echo "vLLM: not running"
    ;;
  *)
    echo "usage: $0 {up|down|status}"
    exit 1
    ;;
esac
