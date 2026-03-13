

## Plan : Upload logo pour les prestataires externes

### Changement dans `ExternalProviderManager.tsx`

Même modification que pour les partenaires :

1. **Importer** `cleanFileUpload` et `useRef` + ajouter icônes `Upload`, `X`, `Image`
2. **Ajouter** un état `isUploading` et un `fileInputRef`
3. **Remplacer** le champ texte "URL du logo" (ligne 350-353) par un bloc upload fichier avec :
   - Input file caché + bouton "Choisir un logo"
   - Aperçu de l'image uploadée avec bouton de suppression
   - Upload vers bucket `site-settings`, dossier `providers`
4. **Conserver** l'aperçu existant dans la liste (ligne 244-246)

### Fichier impacté
- `src/components/partners/ExternalProviderManager.tsx` uniquement

