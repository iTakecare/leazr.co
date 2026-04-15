# Leazr Deploy Infrastructure

Reusable scripts to bootstrap and deploy any Vite/React SPA on the iTakecare VPS
(76.13.0.189) behind Traefik, following the same pattern as LeazrApp.

## Architecture

```
Local machine                        VPS (root@76.13.0.189)
─────────────                        ──────────────────────
Vite/React project                   /opt/<app_name>/
  ├── Dockerfile                       ├── deploy/
  ├── nginx.conf                       │   ├── docker-compose.yml
  ├── deploy.sh          SSH + git     │   └── deploy.sh
  └── deploy/            ──────────►  └── (git clone of your repo)
      ├── docker-compose.yml
      └── deploy.sh

                          Traefik (deploy_internal network)
                            └── routes HTTPS → nginx container
```

---

## Step 1 — Initialize deployment files in a new project

Run `init-deploy.sh` **from the root of your project** (not from this scripts folder).

```bash
bash /path/to/scripts/deploy-infra/init-deploy.sh
```

The script will interactively ask for:
- **App name** — a slug used as the Docker Compose project name and Traefik router name (e.g. `my-app`)
- **Domain** — the public hostname Traefik will route (e.g. `my-app.domain.com`)
- **Env vars** — any `NAME=VALUE` build-time variables (e.g. `VITE_API_URL=https://api.example.com`), one per prompt, empty line to stop

It generates these files in your project root:

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage: node:20-alpine build → nginx:alpine serve |
| `nginx.conf` | SPA routing + gzip compression |
| `deploy/docker-compose.yml` | Traefik labels, `deploy_internal` network, build args |
| `deploy/deploy.sh` | VPS-side: git pull + rebuild + prune |
| `deploy.sh` | Local: git commit/push + SSH trigger |

Commit and push the generated files:

```bash
git add -A
git commit -m "chore: add deploy infra"
git push origin main
```

> **Traefik note:** Generated configs use `certresolver=letsencrypt` for standard domains.
> For wildcard `*.leazr.co` domains, manually change `certresolver` to `ovh` in
> `deploy/docker-compose.yml` and add the relevant `tls.domains` labels.

---

## Step 2 — First deploy: bootstrap the app on the VPS

SSH into the VPS once, then run `new-app-vps.sh`:

```bash
ssh -i ~/.ssh/id_itcmdm root@76.13.0.189

bash /tmp/new-app-vps.sh <git_url> <app_name>
# Example:
bash /tmp/new-app-vps.sh git@github.com:org/my-app.git my-app
```

The script will:
1. Verify Docker and the `deploy_internal` network are ready
2. Clone your repository to `/opt/<app_name>/`
3. Run `deploy/deploy.sh` for the first time (builds image, starts container)

**Prerequisites on the VPS** (should already be in place):
- Docker installed and running
- `deploy_internal` Docker network exists (`docker network create deploy_internal`)
- Traefik running and connected to `deploy_internal`
- SSH access for the git remote (deploy key or HTTPS)

---

## Step 3 — Subsequent deploys

From your **local machine**, in the project root:

```bash
./deploy.sh
```

This will:
1. `git add -A && git commit -m "Deploy <timestamp>" && git push origin main`
2. SSH into the VPS and run `deploy/deploy.sh` remotely

The VPS-side `deploy/deploy.sh` does:
1. `git pull origin main`
2. `docker compose down --remove-orphans`
3. `docker compose build --no-cache`
4. `docker compose up -d --force-recreate`
5. `docker system prune -f`

---

## VPS layout

```
/opt/
  my-app/          ← git clone of repo
  another-app/     ← another app, same pattern
  LeazrApp/        ← the main Leazr app
```

---

## Troubleshooting

**"deploy_internal network not found"**
```bash
docker network create deploy_internal
```

**"Directory /opt/<app_name> already exists"**
```bash
rm -rf /opt/<app_name>
```

**Container starts but Traefik doesn't route traffic**
- Check the domain in `deploy/docker-compose.yml` matches your DNS
- Check Traefik is running: `docker ps | grep traefik`
- Check labels: `docker inspect <container_id> | grep traefik`

**Build fails with missing env vars**
- Update the values directly in `deploy/docker-compose.yml` under `args:`
- Never commit secrets — consider using a `.env` file excluded from git and referencing it in `docker-compose.yml` via `${VAR}` syntax
