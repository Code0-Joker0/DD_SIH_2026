#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p "$QDRANT_STORAGE"
docker compose -f infrastructure/docker/docker-compose.yml up -d
echo "Qdrant up on port $QDRANT_PORT, storage at $QDRANT_STORAGE"
