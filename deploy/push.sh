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

# VITE_* are baked into the web image at build time — make sure .env holds the
# production values before building.
export IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"

echo "==> building (IMAGE_TAG=${IMAGE_TAG})"
docker compose -f docker-compose.yml -f docker-compose.build.yml build

echo "==> pushing to registry"
docker compose -f docker-compose.yml -f docker-compose.build.yml push

echo
echo "Done. On the server (in this project dir, with docker-compose.yml + .env):"
echo "    ./deploy/up.sh        # or: docker compose pull && docker compose up -d"
