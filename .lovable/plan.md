

# Fix: Colonne "Activité" vide dans la table des demandes

## Diagnostic

Le code est correctement implémenté :
- `getOffers.ts` calcule `last_activity_at` à partir de `updated_at` et des workflow logs (vérifié : les données `updated_at` existent bien en base)
- `OffersTable.tsx` affiche la valeur avec `formatDistanceToNow`

La colonne ne montre rien, ce qui peut venir de :
1. **Problème de synchronisation du build** — le code modifié n'est peut-être pas encore actif dans le preview
2. **Le champ `last_activity_at` est perdu lors du cast `as Offer`** dans `useFetchOffers.ts` — bien que le spread `...offer` devrait le préserver, TypeScript pourrait poser problème

## Correction

### 1. `src/hooks/offers/useFetchOffers.ts`
- Ajouter `last_activity_at?: string` à l'interface `Offer` (ligne 22) pour garantir que le champ est typé et préservé

### 2. Ajout d'un log de debug temporaire dans `OffersTable.tsx`
- Ajouter un `console.log` pour vérifier que `last_activity_at` est bien présent dans les données reçues par le composant

Ce sont deux modifications mineures pour s'assurer que le champ est correctement typé et transmis.

