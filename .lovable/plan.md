

## Plan : Logo partenaire uploadable + retrait mention URL

### Changements dans `PartnerManager.tsx`

1. **Remplacer le champ "URL du logo"** (input texte) par un **input file** avec upload vers Supabase Storage via `cleanFileUpload` (service existant, bucket `site-settings`, dossier `partners`). Afficher un apercu de l'image uploadée.

2. **Retirer la mention** `Accessible via : itakecare.be/{slug}` (ligne 234-236) — le slug reste éditable mais sans la mention de domaine spécifique.

3. **Ajouter un état** `isUploading` pour gérer le feedback pendant l'upload.

### Fichier impacté
- `src/components/partners/PartnerManager.tsx` uniquement

