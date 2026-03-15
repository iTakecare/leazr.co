

## Plan : Image Hero pour les partenaires

### Résumé

Ajouter un champ `hero_image_url` à chaque partenaire, avec possibilité d'uploader manuellement une image ou d'en générer une via IA (Gemini). L'image sera stockée dans le bucket `site-settings` sous `partners/heroes/`, exposée via l'API catalogue, et documentée.

### 1. Migration SQL — Ajouter la colonne

Ajouter `hero_image_url TEXT` à la table `partners`.

### 2. Types TypeScript

- Ajouter `hero_image_url?: string` dans `Partner` et `CreatePartnerData` (`src/types/partner.ts`)

### 3. Service partenaire

- Inclure `hero_image_url` dans `createPartner` et `updatePartner` (`src/services/partnerService.ts`)

### 4. UI — Formulaire partenaire (`src/components/partners/PartnerManager.tsx`)

Ajouter dans le dialog de création/modification une section "Image Hero" avec :
- Prévisualisation de l'image actuelle
- Bouton **Télécharger** pour upload manuel (même logique que le logo, bucket `site-settings`, dossier `partners/heroes`)
- Bouton **Générer avec IA** qui appelle la Edge Function `generate-offer-images` (ou une nouvelle fonction dédiée `generate-partner-hero`) pour créer une image adaptée au partenaire (nom, description comme contexte du prompt)

### 5. Edge Function — Génération IA (`supabase/functions/generate-partner-hero/index.ts`)

Nouvelle Edge Function qui :
- Reçoit `{ partner_name, partner_description }` en entrée
- Appelle l'API Gemini (`google/gemini-2.5-flash-image`) avec un prompt adapté (bannière hero professionnelle)
- Upload l'image base64 dans le bucket `site-settings` sous `partners/heroes/`
- Retourne l'URL publique

### 6. API Catalogue — Exposer le champ

Dans `supabase/functions/catalog-api/index.ts` :
- `getPartners` : ajouter `hero_image_url` dans le `select`
- `getPartner` : ajouter `hero_image_url` dans le `select`

### 7. Documentation

Mettre à jour `catalog-skeleton/partners-api.txt` et `catalog-skeleton/types-partners.txt` pour inclure `hero_image_url` dans les réponses et les types.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| Nouvelle migration SQL | `ALTER TABLE partners ADD COLUMN hero_image_url TEXT` |
| `src/types/partner.ts` | Ajouter `hero_image_url` |
| `src/services/partnerService.ts` | Inclure le champ dans les opérations |
| `src/components/partners/PartnerManager.tsx` | Section hero image avec upload + bouton IA |
| `supabase/functions/generate-partner-hero/index.ts` | Nouvelle Edge Function |
| `supabase/functions/catalog-api/index.ts` | Ajouter le champ aux selects partners |
| `catalog-skeleton/partners-api.txt` | Documenter `hero_image_url` |
| `catalog-skeleton/types-partners.txt` | Ajouter le type |

