

# Plan : Corriger l'erreur de peer dependency dans le Dockerfile

## Problème identifié

Le build Docker échoue à cause d'un conflit de peer dependencies :
- **jspdf@4.0.0** est installé dans le projet
- **jspdf-autotable@5.0.2** nécessite **jspdf@^2 || ^3**

La commande `npm ci` est stricte et refuse d'installer avec ce conflit.

## Solution

Modifier le Dockerfile pour utiliser `npm install --legacy-peer-deps` qui ignore les conflits de peer dependencies.

## Modifications à effectuer

### Dockerfile (ligne 6 et 9)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances (optionnel pour package-lock.json)
COPY package.json package-lock.json* ./

# Installer les dépendances avec npm (legacy-peer-deps pour ignorer les conflits)
RUN npm install --legacy-peer-deps

# Variables d'environnement pour le build Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

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

## Résumé des changements

| Élément | Avant | Après |
|---------|-------|-------|
| Commande d'installation | `npm ci` | `npm install --legacy-peer-deps` |
| Copie du lockfile | `package-lock.json` | `package-lock.json*` (optionnel avec `*`) |
| Variables d'env | Non présentes | Ajoutées avec `ARG` et `ENV` |

## Pourquoi ça fonctionne

- `--legacy-peer-deps` ignore les conflits de peer dependencies (comme jspdf/jspdf-autotable)
- Le `*` rend `package-lock.json` optionnel, évitant une erreur si absent
- Les `ARG` permettent de passer les variables Supabase au moment du build Docker

## Configuration Dokploy requise

Après le déploiement, dans Dokploy > Environment, ajouter ces **Build Args** :

```
VITE_SUPABASE_URL=https://cifbetjefyfocafanlhv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw
VITE_SUPABASE_PROJECT_ID=cifbetjefyfocafanlhv
```

