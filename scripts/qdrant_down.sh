#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
docker compose -f infrastructure/docker/docker-compose.yml down
echo "Qdrant stopped (data preserved at $QDRANT_STORAGE)"
