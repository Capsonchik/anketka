#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/anketka}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
FRONT_SERVICE="${FRONT_SERVICE:-front}"

cd "$APP_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building frontend"
npm ci
npm run build

echo "==> Restarting frontend service: ${FRONT_SERVICE}"
systemctl restart "$FRONT_SERVICE"

echo "==> Rebuilding & restarting backend (docker compose)"
docker compose -f "$COMPOSE_FILE" up -d --build backend


echo "==> Status"
systemctl status "$FRONT_SERVICE" --no-pager || true
docker compose -f "$COMPOSE_FILE" ps

