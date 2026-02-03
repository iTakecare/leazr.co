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
