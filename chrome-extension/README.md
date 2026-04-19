# Leazr Sourcing Helper — Extension Chrome

Extension Chrome qui permet de capturer des offres produit sur les sites fournisseurs (Coolblue, Mediamarkt, Amazon, Apple, Backmarket, etc.) et de les pousser directement dans Leazr, rattachées à une commande/contrat/offre.

## Architecture

- **Manifest V3** — service worker + content scripts
- **React** pour la popup
- **Supabase JS** pour l'auth et l'appel aux edge functions
- **Un adapter par site** dans `src/content/adapters/` — chacun définit comment extraire titre/prix/stock/délai d'une page produit

## Workflow utilisateur

1. L'employé/admin installe l'extension
2. Il se connecte avec ses identifiants Leazr dans la popup (Supabase Auth)
3. Dans Leazr, sur une commande, il clique **« Sourcer avec extension »** → l'extension reçoit le contexte (commande + ligne)
4. Il navigue sur un site fournisseur
5. Un badge flottant 🦎 apparaît automatiquement sur les pages produit avec prix/stock/délai détectés
6. Clic sur **« Ajouter à la commande »** → l'offre est postée à `sourcing-ingest-offer`
7. Selon son rôle :
   - **admin / sales_manager** → statut `approved` direct
   - **employee** → statut `proposed`, en attente de validation dans Leazr

## Commandes

```bash
# Install
npm install

# Dev (watch mode)
npm run dev

# Build production
npm run build

# Package en .zip pour distribution
npm run package
```

## Installation en mode développeur

1. `npm run build`
2. Ouvre `chrome://extensions`
3. Active « Mode développeur »
4. « Charger l'extension non empaquetée » → pointe vers le dossier `dist/`

## Ajouter un nouvel adapter

1. Créer `src/content/adapters/<site>.ts` qui exporte un `SiteAdapter`
2. Implémenter `matches`, `isProductPage`, `extract` (cf. `coolblue.ts` pour exemple)
3. L'enregistrer dans `src/content/adapters/index.ts`
4. Ajouter le host à `content_scripts[0].matches` dans `manifest.json`
5. Rebuilder

## Sites supportés actuellement

| Site | Status | Priorité |
|---|---|---|
| Coolblue | ✅ Adapter v1 | P0 (top volume) |
| Mediamarkt BE | ⏳ À faire | P0 |
| Amazon Business FR | ⏳ À faire | P0 (top volume) |
| Gomibo | ⏳ À faire | P1 |
| Apple Refurbished BE | ⏳ À faire | P1 |
| Backmarket Pro | ⏳ À faire | P1 |
| Chapp | ⏳ À faire | P2 |
| Gamers-Outlet | ⏳ À faire | P2 |
| Dipli | ⏳ À faire | P2 |
| Ingram Micro | ⏳ API B2B (pas dans extension) | — |

## Edge functions Leazr utilisées

- `sourcing-ingest-offer` — POST une offre depuis l'extension
- `sourcing-list-suppliers` — liste des fournisseurs (pour matching host, avec anonymisation)
