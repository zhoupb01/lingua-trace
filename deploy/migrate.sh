#!/usr/bin/env bash
# Server: apply pending DB migrations using the already-pulled api image.
# The image bundles the drizzle-orm migrator + ./drizzle SQL, so no source code,
# node_modules, or drizzle-kit is needed here — just this file + docker-compose.yml + .env.
#
# Run it as a separate, explicit step (migrations are NOT applied on boot):
#   docker compose pull && ./deploy/migrate.sh && ./deploy/up.sh
set -euo pipefail

cd "$(dirname "$0")/.."   # project root

if [ ! -f .env ]; then
    echo "ERROR: .env not found in $(pwd)" >&2
    exit 1
fi

# One-off container on the api service's env_file + networks (reaches postgres + OpenBao).
docker compose run --rm api bun server.js migrate
