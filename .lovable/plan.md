

## Plan : Mise à jour versioning et documentation UI

### Problèmes identifiés

1. **Versioning incohérent** : Les versions affichées sont "v2024.4" et "v2024.5" alors qu'on est en 2026. Il faut passer à **v2026.1**.

2. **Endpoints manquants dans l'UI** : Le tableau `endpoints` dans `CatalogApiSettings.tsx` (lignes 283-408) ne contient aucun endpoint partenaire ni prestataire. Seul le fichier texte téléchargeable a été mis à jour.

3. **Sections info manquantes** : Les encadrés colorés (lignes 604-627) mentionnent "v2024.4" et ne parlent pas de l'écosystème partenaires.

### Modifications

**1. `public/catalog-api-documentation.txt`**
- Remplacer "VERSION : 2024.5" par "VERSION : 2026.1"
- Remplacer toutes les mentions "v2024.4" / "v2024.5" par "v2026.1"

**2. `src/components/catalog/management/CatalogApiSettings.tsx`**
- Remplacer "v2024.4" par "v2026.1" dans les encadrés info (lignes 605, 617)
- Ajouter un encadré violet/indigo pour l'écosystème partenaires (nouveau bloc après les fournisseurs)
- Ajouter les endpoints manquants dans le tableau `endpoints` :
  - `GET partners` — Liste des partenaires actifs
  - `GET partners/{slug}` — Détail d'un partenaire
  - `GET partners/{slug}/packs` — Packs exclusifs du partenaire
  - `GET partners/{slug}/providers` — Prestataires liés au partenaire
  - `GET providers` — Liste des prestataires externes
  - `GET providers/{id}/products` — Produits d'un prestataire

