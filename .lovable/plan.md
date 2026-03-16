

# Fix : Les KPIs du dashboard client affichent 0

## Diagnostic

Le dashboard client affiche "0 €/mois", "0 équipements actifs" et "0 demandes en attente" alors que la section "Activité récente" montre bien un contrat actif. Le problème se situe dans le hook `useClientData.ts`.

**Cause probable** : Le `queryWithCompanyFilter()` retourne déjà un `PostgrestFilterBuilder` (via `.select("*")`), et ensuite `fetchClientStats` appelle à nouveau `.select('id, monthly_payment, end_date')` dessus. Ce chaînage de double `.select()` peut échouer silencieusement selon la version du client Supabase, et l'erreur est avalée par le `catch` qui laisse les stats à 0.

De plus, le `useEffect` dépend uniquement de `[user?.id]` mais utilise `services` de `useMultiTenant`, ce qui peut poser un souci de timing.

## Plan de correction

### Fichier : `src/hooks/useClientData.ts`

1. **Remplacer `services.xxx.query().select(...)` par `supabase.from('xxx').select(...)`** dans les 3 fonctions internes (`fetchClientStats`, `fetchRecentActivity`, `fetchNotifications`) pour éviter le double `.select()`.

2. **Ajouter des logs d'erreur plus explicites** dans `fetchClientStats` pour tracer les éventuels échecs de requêtes Supabase (erreur retournée dans `error` du destructuring mais jamais vérifiée actuellement).

3. **Vérifier les erreurs retournées par Supabase** : actuellement `fetchClientStats` ne vérifie pas le champ `error` des requêtes, donc une erreur RLS/permission passe inaperçue.

### Résumé des changements

| Élément | Changement |
|---|---|
| `fetchClientStats` | Requête directe `supabase.from('contracts')` + vérification `error` |
| `fetchRecentActivity` | Idem, requête directe |
| `fetchNotifications` | Idem pour les requêtes via `services` |

