

## Plan : Endpoint de génération de numéro de dossier séquentiel + mise à jour doc

### Contexte
Le plus grand numéro existant est `ITC-2026-OFF-9975`. Le format cible est `ITC-{année}-OFF-{séquentiel}`.

### 1. Migration SQL — Séquence + fonction RPC

- Créer une séquence `public.offer_dossier_seq` démarrant à **9976**
- Créer une fonction RPC `get_next_dossier_number()` (SECURITY DEFINER) qui appelle `nextval` et retourne le numéro formaté complet `ITC-YYYY-OFF-XXXX`

### 2. Nouvel endpoint dans `catalog-api/index.ts`

**Route** : `POST /partners/{slug}/next-reference`

- Ajouter un cas dans le switch `partners` : si `subPaths[1] === 'next-reference'` et `req.method === 'POST'`
- Appeler la RPC `get_next_dossier_number()` 
- Retourner `{ reference_number: "ITC-2026-OFF-9976" }`
- Nécessite la clé API (authentifié)

### 3. Mise à jour de `create-product-request/index.ts`

Remplacer la génération timestamp (ligne 412-414) par un appel à la même RPC :

```typescript
// Si reference_number fourni → l'utiliser
// Sinon → appeler get_next_dossier_number() pour un numéro séquentiel
```

### 4. Mise à jour documentation `public/catalog-api-documentation.txt`

Ajouter dans la section partenaires :

```
POST /partners/{slug}/next-reference
→ Génère et réserve le prochain numéro de dossier séquentiel
← { "reference_number": "ITC-2026-OFF-9976" }
```

Et documenter le champ `reference_number` dans la section create-product-request.

### 5. Mise à jour `CatalogApiSettings.tsx`

Ajouter la documentation de l'endpoint `next-reference` dans l'interface d'aide API.

### Fichiers modifiés
- Migration SQL (séquence + RPC)
- `supabase/functions/catalog-api/index.ts` — nouveau endpoint
- `supabase/functions/create-product-request/index.ts` — fallback séquentiel
- `public/catalog-api-documentation.txt` — documentation endpoint
- `src/components/catalog/management/CatalogApiSettings.tsx` — documentation UI

