#!/bin/bash
set -euo pipefail

# NOTE: `git pull origin main` is done by the CI step BEFORE invoking this
# script (so this file is never rewritten mid-execution). This script only
# builds the image and swaps the container.

cd /opt/LeazrApp

# Build the new image FIRST, while the current app keeps serving. With the
# .dockerignore (tiny context) and Docker layer cache, the slow npm-install
# layer is reused unless package*.json changed, so this is fast. We deliberately
# do NOT use --no-cache and do NOT stop the running app before building: a
# failed or timed-out build must never take production down — `set -e` exits
# here, leaving the old container running untouched.
echo ">>> Build new image (layer-cached, small context)..."
docker compose -f deploy/docker-compose.yml build

# Only now, with a good image in hand, swap the container (brief ~1s recreate).
echo ">>> Swap to new image..."
docker compose -f deploy/docker-compose.yml up -d --force-recreate --remove-orphans

echo ">>> Cleanup dangling images..."
docker image prune -f

echo ">>> Done. LeazrApp deployed."
