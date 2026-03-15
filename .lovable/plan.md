

## Diagnostic

Les logs montrent que la connexion IMAP **réussit** (16:59:03 "Connected successfully") mais la fonction **timeout** ~80 secondes plus tard (17:00:25 "shutdown") sans jamais logger "Synced X emails". Le problème est clair :

**La fonction télécharge le corps complet de chaque email** (`source: true` dans `client.fetch`) sur une période de 10 jours. Avec des emails volumineux (pièces jointes, HTML), ça dépasse le timeout de 60s des Edge Functions Supabase.

De plus, le frontend (`handleSync`) ne vérifie pas `data?.error` quand la fonction retourne un status 400, donc l'erreur est silencieuse.

---

## Plan de corrections

### 1. Edge function — Optimiser le fetch pour éviter le timeout

- **Ne plus télécharger `source`** (corps complet) pour tous les emails. Utiliser uniquement `envelope` pour les métadonnées (from, to, subject, date, messageId).
- Télécharger le `source` uniquement pour les emails **nouveaux** (pas déjà en base), et limiter à 20 par batch.
- Ajouter des logs de progression (`Processing message X...`).
- Ajouter un timeout de sécurité (45s) pour s'arrêter proprement avant le timeout de la plateforme.

### 2. Frontend — Gérer les erreurs et le feedback

- Dans `EmailInbox.tsx` `handleSync` : vérifier `data?.error` en plus de `error`.
- Afficher le message d'erreur exact retourné par la fonction.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/sync-imap-emails/index.ts` | Fetch envelope-only d'abord, source uniquement pour les nouveaux, timeout interne 45s, logs de progression |
| `src/components/support/EmailInbox.tsx` | Vérifier `data?.error`, afficher message exact |

