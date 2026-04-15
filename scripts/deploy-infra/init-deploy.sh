#!/bin/bash
set -e

# ============================================================
# init-deploy.sh — Initialize deployment files for a new app
# Run from the ROOT of your project directory.
# ============================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Leazr Deployment Initializer${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ── 1. Gather inputs ──────────────────────────────────────────

read -rp "App name (slug, e.g. my-app): " APP_NAME
if [[ -z "$APP_NAME" ]]; then
  echo -e "${RED}Error: app name cannot be empty.${NC}"
  exit 1
fi

read -rp "Domain (e.g. my-app.domain.com): " DOMAIN
if [[ -z "$DOMAIN" ]]; then
  echo -e "${RED}Error: domain cannot be empty.${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Enter environment variables as name=value pairs.${NC}"
echo -e "${YELLOW}Press Enter with an empty line to stop.${NC}"
echo ""

ENV_VARS=()
while true; do
  read -rp "  Env var (or empty to stop): " ENV_PAIR
  [[ -z "$ENV_PAIR" ]] && break
  if [[ "$ENV_PAIR" != *=* ]]; then
    echo -e "${RED}  Invalid format. Use name=value.${NC}"
    continue
  fi
  ENV_VARS+=("$ENV_PAIR")
  echo -e "${GREEN}  + ${ENV_PAIR%%=*}${NC}"
done

echo ""
echo -e "${CYAN}Generating files for:${NC}"
echo -e "  App name : ${GREEN}${APP_NAME}${NC}"
echo -e "  Domain   : ${GREEN}${DOMAIN}${NC}"
echo -e "  Env vars : ${GREEN}${#ENV_VARS[@]}${NC} defined"
echo ""

# ── 2. Build dynamic ARG/ENV blocks ──────────────────────────

DOCKERFILE_ARGS=""
DOCKERFILE_ENVS=""
COMPOSE_ARGS=""

for pair in "${ENV_VARS[@]}"; do
  KEY="${pair%%=*}"
  VALUE="${pair#*=}"
  DOCKERFILE_ARGS+="ARG ${KEY}\n"
  DOCKERFILE_ENVS+="ENV ${KEY}=\$${KEY}\n"
  COMPOSE_ARGS+="        ${KEY}: ${VALUE}\n"
done

# ── 3. Write Dockerfile ───────────────────────────────────────

cat > Dockerfile <<EOF
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Build-time environment variables
$(printf '%b' "$DOCKERFILE_ARGS")
$(printf '%b' "$DOCKERFILE_ENVS")
# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
USER appuser

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

echo -e "${GREEN}  [OK] Dockerfile${NC}"

# ── 4. Write nginx.conf ───────────────────────────────────────

cat > nginx.conf <<'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";
}
EOF

echo -e "${GREEN}  [OK] nginx.conf${NC}"

# ── 5. Write deploy/docker-compose.yml ───────────────────────

mkdir -p deploy

# Build the args block only if there are env vars
if [[ ${#ENV_VARS[@]} -gt 0 ]]; then
  COMPOSE_ARGS_BLOCK="      args:\n$(printf '%b' "$COMPOSE_ARGS")"
else
  COMPOSE_ARGS_BLOCK=""
fi

cat > deploy/docker-compose.yml <<EOF
name: ${APP_NAME}

services:
  frontend:
    build:
      context: ..
      dockerfile: Dockerfile
$(printf '%b' "$COMPOSE_ARGS_BLOCK")
    restart: unless-stopped
    networks:
      - deploy_internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.${APP_NAME}.entrypoints=websecure"
      - "traefik.http.routers.${APP_NAME}.tls.certresolver=letsencrypt"
      - "traefik.http.services.${APP_NAME}.loadbalancer.server.port=80"

networks:
  deploy_internal:
    external: true
EOF

echo -e "${GREEN}  [OK] deploy/docker-compose.yml${NC}"

# ── 6. Write deploy/deploy.sh (VPS-side) ─────────────────────

cat > deploy/deploy.sh <<EOF
#!/bin/bash
set -e

APP_DIR="/opt/${APP_NAME}"

echo ">>> Pulling latest code..."
cd "\$APP_DIR"
git pull origin main

echo ">>> Stopping existing containers..."
docker compose -f deploy/docker-compose.yml down --remove-orphans

echo ">>> Building and starting containers..."
docker compose -f deploy/docker-compose.yml build --no-cache
docker compose -f deploy/docker-compose.yml up -d --force-recreate

echo ">>> Cleaning up old images..."
docker system prune -f

echo ">>> Done. ${APP_NAME} deployed successfully."
EOF

chmod +x deploy/deploy.sh
echo -e "${GREEN}  [OK] deploy/deploy.sh${NC}"

# ── 7. Write local deploy.sh ──────────────────────────────────

cat > deploy.sh <<EOF
#!/bin/bash
set -e

VPS="root@76.13.0.189"
SSH_KEY="\${HOME}/.ssh/id_itcmdm"
APP_DIR="/opt/${APP_NAME}"

echo ">>> Deploying ${APP_NAME} to VPS..."

# Commit and push local changes
git add -A
git commit -m "Deploy \$(date '+%Y-%m-%d %H:%M')" || echo "(nothing to commit, pushing anyway)"
git push origin main

echo ">>> Triggering VPS deploy..."
ssh -i "\$SSH_KEY" "\$VPS" "bash \${APP_DIR}/deploy/deploy.sh"

echo ">>> Deployed. App available at https://${DOMAIN}"
EOF

chmod +x deploy.sh
echo -e "${GREEN}  [OK] deploy.sh${NC}"

# ── 8. Summary ────────────────────────────────────────────────

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  All files generated successfully!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Review and commit the generated files."
echo -e "  2. Push to your git remote:"
echo -e "     ${GREEN}git add -A && git commit -m 'chore: add deploy infra' && git push${NC}"
echo -e "  3. First deploy on VPS:"
echo -e "     ${GREEN}bash new-app-vps.sh <git_url> ${APP_NAME}${NC}"
echo -e "  4. Subsequent deploys:"
echo -e "     ${GREEN}./deploy.sh${NC}"
echo ""
