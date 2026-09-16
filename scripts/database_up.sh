#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

# Export UID/GID so docker-compose can pass them to the postgres service's
# `user:` directive — this lets Postgres write to the bind-mounted directory
# without requiring sudo or a chown on the host.
# Note: GID is read-only in bash; use $(id -g) explicitly.
export UID
export GID
GID=$(id -g)

mkdir -p "$QDRANT_STORAGE"
mkdir -p "$POSTGRES_STORAGE" && chmod 700 "$POSTGRES_STORAGE"

docker compose -f infrastructure/docker/docker-compose.yml up -d
echo "Qdrant  up on port $QDRANT_PORT,   storage at $QDRANT_STORAGE"
echo "Postgres up on port $POSTGRES_PORT, storage at $POSTGRES_STORAGE"
