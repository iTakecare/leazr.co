# Démon de synchronisation push des emails (IMAP IDLE).
# Tourne en continu sur le VPS, hors pipeline frontend.
FROM denoland/deno:2.1.4

WORKDIR /app
COPY main.ts .

# Pré-cache les dépendances au build.
RUN deno cache main.ts || true

# --allow-sys : imapflow/pino lit le hostname au chargement.
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-sys", "main.ts"]
