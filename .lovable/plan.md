
# Plan : Résoudre les erreurs de déploiement Dokploy/Hostinger

## Diagnostic

L'erreur provient de la commande `bun install --frozen-lockfile` qui échoue car :

1. **Lockfile désynchronisé** : Le fichier `bun.lockb` n'est pas à jour par rapport à `package.json`
2. **Multiples lockfiles** : Votre projet contient 3 lockfiles différents :
   - `bun.lockb` (binaire Bun)
   - `bun.lock` (texte Bun)  
   - `package-lock.json` (npm)
3. **Warning peer dependency** : `zod@3.23.8` a une dépendance peer incorrecte (non bloquant)

## Solution recommandée

### Option A : Utiliser npm au lieu de Bun (plus simple)

Créer un fichier de configuration pour forcer Dokploy à utiliser npm :

**Créer `nixpacks.toml`** à la racine du projet :

```toml
[phases.setup]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]
```

**OU créer un `Dockerfile`** personnalisé pour plus de contrôle :

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances avec npm
RUN npm ci

# Copier le reste du code
COPY . .

# Build l'application
RUN npm run build

# Phase de production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Créer `nginx.conf`** pour le routing SPA :

```nginx
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
}
```

### Option B : Régénérer le lockfile Bun (si vous voulez garder Bun)

1. Supprimer les lockfiles existants de votre repo GitHub
2. Régénérer un lockfile Bun propre
3. Commit et push

**Étapes sur votre machine locale :**

```bash
# Supprimer tous les lockfiles
rm bun.lockb bun.lock package-lock.json

# Installer avec bun pour régénérer le lockfile
bun install

# Commit le nouveau lockfile
git add bun.lockb
git commit -m "chore: regenerate bun lockfile"
git push
```

### Option C : Nettoyer et utiliser uniquement npm

1. Supprimer les lockfiles Bun du repo
2. Ne garder que `package-lock.json`

```bash
# Supprimer les lockfiles Bun
rm bun.lockb bun.lock

# Mettre à jour .gitignore pour ignorer bun
echo "bun.lockb" >> .gitignore
echo "bun.lock" >> .gitignore

# Commit
git add .gitignore
git rm bun.lockb bun.lock
git commit -m "chore: remove bun lockfiles, use npm only"
git push
```

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `Dockerfile` | Créer - Configuration Docker pour le build |
| `nginx.conf` | Créer - Configuration Nginx pour SPA routing |
| `bun.lockb` / `bun.lock` | Supprimer ou régénérer |

## Solution recommandée

**Option A (Dockerfile)** est la plus robuste car elle donne un contrôle total sur le processus de build et fonctionne avec tous les providers d'hébergement.

## Variables d'environnement

N'oubliez pas de configurer les variables d'environnement dans Dokploy :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
