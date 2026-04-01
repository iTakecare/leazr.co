#!/bin/bash
set -e

cd /opt/LeazrApp

echo ">>> Pull latest code..."
git pull origin main

echo ">>> Stop existing containers..."
docker compose -f deploy/docker-compose.yml down --remove-orphans

echo ">>> Build & restart containers..."
docker compose -f deploy/docker-compose.yml build --no-cache
docker compose -f deploy/docker-compose.yml up -d --force-recreate

echo ">>> Cleanup old images..."
docker system prune -f

echo ">>> Done. LeazrApp deployed."
