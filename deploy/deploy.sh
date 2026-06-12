#!/usr/bin/env bash
# Wayline deploy script — run on the server (manually or by the CI runner).
# Pulls the latest code and (re)builds + restarts the production stack.
#
# Assumes:
#   - This repo is checked out at $DEPLOY_DIR (default /srv/wayline).
#   - A populated .env exists in $DEPLOY_DIR (never committed).
#   - OSRM map data exists at $OSRM_DATA_DIR (see .env).
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/wayline}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="docker-compose.prod.yaml"

cd "$DEPLOY_DIR"

echo "==> Wayline deploy starting ($(date -Is))"
echo "==> Directory: $DEPLOY_DIR   Branch: $BRANCH"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $DEPLOY_DIR. Create it from .env.example." >&2
  exit 1
fi

echo "==> Fetching latest code"
git fetch --prune origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Building and starting the stack"
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo "==> Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Current state:"
docker compose -f "$COMPOSE_FILE" ps

echo "==> Wayline deploy finished ($(date -Is))"
