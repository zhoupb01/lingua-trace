#!/usr/bin/env bash
# Server: pull the freshly pushed images and (re)start.
# The server only needs this script + docker-compose.yml + .env in this dir —
# no source code, no build.
set -euo pipefail

cd "$(dirname "$0")/.."   # project root

if [ ! -f .env ]; then
    echo "ERROR: .env not found in $(pwd)" >&2
    exit 1
fi

docker compose pull
HEALTH_WAIT_TIMEOUT="${HEALTH_WAIT_TIMEOUT:-120}"
if ! docker compose up -d --wait --wait-timeout "${HEALTH_WAIT_TIMEOUT}"; then
    echo
    docker compose ps || true
    echo
    docker compose logs --tail=120 api web || true
    exit 1
fi
docker compose ps
