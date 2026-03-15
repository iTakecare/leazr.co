

## Problème identifié

Deux problèmes concrets :

1. **`catalog-skeleton/partners-api.txt` n'a pas été mis à jour** — Ce fichier est téléchargeable via le bouton "Télécharger" dans l'interface et fait partie du ZIP des fichiers skeleton. Il ne contient aucune mention de `next-reference` ni du format `ITC-YYYY-OFF-XXXX`.

2. **Visibilité dans l'interface** — Les endpoints `POST next-reference` et `POST create-product-request` sont en fin de liste, noyés parmi les GET. Pas de section dédiée ni de badge "NOUVEAU" pour les repérer.

## Modifications

### 1. Mettre à jour `catalog-skeleton/partners-api.txt`

Ajouter une section complète après les endpoints `GET /providers/{id}/products` :

- `POST /v1/{companyId}/partners/{slug}/next-reference` — documentation complète avec format, réponse JSON, et flux d'utilisation en 3 étapes
- Documenter le champ `reference_number` dans le payload de `create-product-request`
- Ajouter un exemple curl complet

### 2. Améliorer la visibilité dans `CatalogApiSettings.tsx`

- Ajouter un badge `NOUVEAU` (ou couleur distincte) sur les endpoints POST `next-reference` et `create-product-request` dans la liste des endpoints
- Optionnel : regrouper visuellement les endpoints par section (Catalogue, Partenaires, Demandes) au lieu d'une liste plate

### Fichiers modifiés
- `catalog-skeleton/partners-api.txt` — ajouter documentation next-reference + reference_number
- `src/components/catalog/management/CatalogApiSettings.tsx` — badge "NOUVEAU" sur les 2 endpoints POST

