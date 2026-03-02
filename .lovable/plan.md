
# Fix: URL "undefined" dans le téléchargement du PDF signé

## Cause racine

La requete reseau montre clairement le probleme :
```
POST https://undefined.supabase.co/functions/v1/generate-signed-contract-pdf
apikey: undefined
```

Le service `signedContractPdfService.tsx` utilise `import.meta.env.VITE_SUPABASE_PROJECT_ID` et `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` pour construire l'URL et les headers. Ces variables d'environnement ne sont pas disponibles dans l'environnement preview de Lovable, donc elles retournent `undefined`.

Or, le fichier `client.ts` contient deja ces valeurs en dur :
- `SUPABASE_URL = "https://cifbetjefyfocafanlhv.supabase.co"`
- `SUPABASE_PUBLISHABLE_KEY = "eyJ..."`

## Solution

Modifier `signedContractPdfService.tsx` pour importer et utiliser les constantes deja definies dans `client.ts` au lieu des variables d'environnement.

## Fichier modifie

**`src/services/signedContractPdfService.tsx`**

1. Ajouter `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` aux imports depuis `@/integrations/supabase/client`

2. Remplacer la construction de l'URL (lignes 17-18) :
```typescript
// Avant
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const url = `https://${projectId}.supabase.co/functions/v1/generate-signed-contract-pdf`;

// Apres
const url = `${SUPABASE_URL}/functions/v1/generate-signed-contract-pdf`;
```

3. Remplacer l'apikey dans les headers (ligne 25) :
```typescript
// Avant
'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,

// Apres
'apikey': SUPABASE_PUBLISHABLE_KEY,
```

4. Appliquer le meme correctif dans la fonction `generateAndUploadSignedContractPDF` (lignes ~97-105) qui utilise les memes variables d'environnement.

## Impact

- Corrige le "Failed to fetch" en generant une URL valide (`https://cifbetjefyfocafanlhv.supabase.co/functions/v1/...`)
- Fonctionne dans tous les environnements (preview Lovable, production)
- Aucun autre fichier modifie
