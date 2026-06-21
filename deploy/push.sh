#!/usr/bin/env bash
# Local: build the images and push them to the registry.
# The server then only needs to pull + up (see deploy/up.sh).
#
# Usage: ./deploy/push.sh [tag]      # tag defaults to $IMAGE_TAG or "latest"
#
# Prerequisite (once): docker login registry.cn-hangzhou.aliyuncs.com
set -euo pipefail

cd "$(dirname "$0")/.."   # project root

if [ ! -f .env ]; then
    echo "ERROR: .env not found. Run: cp .env.example .env  (and fill it in)" >&2
    exit 1
fi

# Build-time interpolation — chiefly the VITE_* baked into the web bundle — reads
# from these env files, later overriding earlier. .env is the base; if a
# .env.production sits alongside it, its values win. So you can keep a dev .env for
# local work and put only the prod overrides (the VITE_*) in .env.production.
# Shell-exported vars (IMAGE_TAG below) still beat both.
env_args=(--env-file .env)
if [ -f .env.production ]; then
    env_args+=(--env-file .env.production)
    echo "==> env: .env + .env.production"
else
    echo "==> env: .env"
fi

export IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"

echo "==> building (IMAGE_TAG=${IMAGE_TAG})"
docker compose "${env_args[@]}" -f docker-compose.yml -f docker-compose.build.yml build

echo "==> pushing to registry"
# Both files are required: `docker compose push` only pushes services that have
# a `build:` section (it assumes locally-built images), and that lives in the
# build overlay. Without it, every service is silently Skipped.
docker compose "${env_args[@]}" -f docker-compose.yml -f docker-compose.build.yml push

echo
echo "Done. On the server (in this project dir, with docker-compose.yml + .env):"
echo "    ./deploy/up.sh        # or: docker compose pull && docker compose up -d"
