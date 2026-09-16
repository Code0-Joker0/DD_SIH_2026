#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
export UID
GID=$(id -g); export GID
docker compose -f infrastructure/docker/docker-compose.yml down
echo "Qdrant   stopped (data preserved at $QDRANT_STORAGE)"
echo "Postgres stopped (data preserved at $POSTGRES_STORAGE)"
