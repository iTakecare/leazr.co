#!/bin/bash
# Run by cron on the VPS (every couple of minutes). Pulls the latest frontend
# image from ghcr.io and recreates the container ONLY when the image actually
# changed. This is the deploy trigger: GitHub Actions pushes the image to the
# registry, and the VPS pulls it OUTBOUND (Hostinger blocks inbound from cloud
# IPs, so the runner can't reach us — but we can reach the registry).
set -uo pipefail

cd /opt/LeazrApp || exit 0

IMAGE="ghcr.io/itakecare/leazr-frontend:latest"
COMPOSE="docker compose -f deploy/docker-compose.yml"

# Keep the repo (compose file, this script) up to date.
git pull -q origin main >/dev/null 2>&1 || true

before="$(docker images -q "$IMAGE" 2>/dev/null)"
$COMPOSE pull frontend >/dev/null 2>&1 || exit 0
after="$(docker images -q "$IMAGE" 2>/dev/null)"

if [ "$before" != "$after" ]; then
  echo "$(date -u +%FT%TZ) new image ($after) — recreating frontend"
  $COMPOSE up -d frontend >/dev/null 2>&1
  docker image prune -f >/dev/null 2>&1
fi
