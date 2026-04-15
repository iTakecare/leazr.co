#!/bin/bash
set -e

# ============================================================
# new-app-vps.sh — Bootstrap a new app on the VPS
# Run ON THE VPS as root.
#
# Usage: bash new-app-vps.sh <git_url> <app_name>
# ============================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

GIT_URL="${1:-}"
APP_NAME="${2:-}"

if [[ -z "$GIT_URL" || -z "$APP_NAME" ]]; then
  echo -e "${RED}Usage: bash new-app-vps.sh <git_url> <app_name>${NC}"
  echo ""
  echo "  git_url   — SSH or HTTPS URL of the repository"
  echo "  app_name  — slug used as directory name under /opt/ and in compose"
  echo ""
  echo "  Example:"
  echo "    bash new-app-vps.sh git@github.com:org/my-app.git my-app"
  exit 1
fi

APP_DIR="/opt/${APP_NAME}"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  VPS App Bootstrap: ${APP_NAME}${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  Repo    : ${GREEN}${GIT_URL}${NC}"
echo -e "  App dir : ${GREEN}${APP_DIR}${NC}"
echo ""

# ── Verify Docker is available ────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo -e "${RED}Error: Docker is not installed on this VPS.${NC}"
  exit 1
fi

# ── Verify deploy_internal network exists ─────────────────────
if ! docker network inspect deploy_internal &>/dev/null; then
  echo -e "${RED}Error: Docker network 'deploy_internal' does not exist.${NC}"
  echo -e "${RED}Create it with: docker network create deploy_internal${NC}"
  exit 1
fi

# ── Clone repository ──────────────────────────────────────────
if [[ -d "$APP_DIR" ]]; then
  echo -e "${RED}Error: Directory ${APP_DIR} already exists.${NC}"
  echo -e "${RED}Remove it first if you want to start fresh: rm -rf ${APP_DIR}${NC}"
  exit 1
fi

echo ">>> Cloning repository to ${APP_DIR}..."
git clone "$GIT_URL" "$APP_DIR"
echo -e "${GREEN}  [OK] Repository cloned.${NC}"

# ── Run deploy script ─────────────────────────────────────────
DEPLOY_SCRIPT="${APP_DIR}/deploy/deploy.sh"

if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
  echo -e "${RED}Error: deploy/deploy.sh not found in the repository.${NC}"
  echo -e "${RED}Make sure you ran init-deploy.sh and committed the generated files.${NC}"
  exit 1
fi

echo ""
echo ">>> Running first deploy..."
chmod +x "$DEPLOY_SCRIPT"
bash "$DEPLOY_SCRIPT"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  ${APP_NAME} is live on the VPS!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  Future deploys: run ${GREEN}./deploy.sh${NC} from your local machine."
echo ""
