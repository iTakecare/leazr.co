

## Problème : la sauvegarde IMAP ne fonctionne pas

### Causes identifiées

1. **Gestion d'erreur silencieuse** : `supabase.functions.invoke()` ne met l'erreur dans `error` que pour les erreurs réseau/CORS. Si l'edge function retourne un status 400 avec `{ error: "message" }`, le SDK met la réponse dans `data` (pas `error`). Le code actuel ne vérifie pas `data.error`, donc l'échec est silencieux — le toast success ne s'affiche pas, mais le toast error non plus.

2. **Colonne `imap_password_encrypted NOT NULL`** : Lors du premier insert, si le mot de passe est fourni, l'edge function le convertit en base64. Mais si pour une raison quelconque le champ est vide, l'upsert échoue car la colonne est `NOT NULL`.

3. **CORS headers incomplets** : Il manque les headers `x-supabase-client-platform`, etc. dans les CORS de l'edge function, ce qui peut bloquer l'appel preflight.

### Corrections

**1. Edge function `sync-imap-emails/index.ts`** :
- Mettre à jour les CORS headers avec tous les headers requis
- Ajouter du logging pour le debug

**2. Frontend `ImapSettingsForm.tsx`** :
- Corriger le `mutationFn` pour vérifier `data.error` en plus de `error`
- Ajouter un log console pour debug

**3. Migration SQL** :
- Rendre `imap_password_encrypted` nullable (pour permettre l'upsert sans mot de passe lors d'une mise à jour)

### Fichiers modifiés
- `supabase/functions/sync-imap-emails/index.ts` — CORS + logging
- `src/components/support/ImapSettingsForm.tsx` — meilleure gestion d'erreur
- Migration SQL — `ALTER COLUMN imap_password_encrypted DROP NOT NULL`

