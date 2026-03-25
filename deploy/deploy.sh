#!/bin/bash
set -e

cd /opt/LeazrApp

echo ">>> Pull latest code..."
git pull origin main

echo ">>> Build & restart containers..."
docker compose -f deploy/docker-compose.yml build --no-cache
docker compose -f deploy/docker-compose.yml down --remove-orphans
docker compose -f deploy/docker-compose.yml up -d

echo ">>> Cleanup old images..."
docker system prune -f

echo ">>> Done. LeazrApp deployed."
