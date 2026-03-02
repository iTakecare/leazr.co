
# Fix: Recuperation fiable de l'adresse IP du signataire

## Probleme

Dans `src/pages/client/PublicContractSignature.tsx`, l'adresse IP est recuperee cote client via `https://api.ipify.org?format=json`. Ce service externe peut echouer pour plusieurs raisons :
- Bloqueur de publicites ou extension de securite du navigateur
- Probleme reseau ou timeout
- Service temporairement indisponible

Quand ca echoue, la valeur `"unknown"` est stockee en base.

## Solution

Deplacer la recuperation de l'IP cote serveur, dans la fonction RPC `sign_contract_public` ou dans un edge function intermediaire. Le serveur a acces aux headers HTTP contenant l'IP reelle du client (`x-forwarded-for`, `x-real-ip`, etc.).

### Approche retenue : Edge function proxy

Creer une edge function `get-client-ip` qui retourne simplement l'IP du client a partir des headers de la requete. C'est plus fiable que d'appeler un service tiers depuis le navigateur.

### Fichiers modifies

1. **`supabase/functions/get-client-ip/index.ts`** (nouveau)
   - Edge function simple qui lit l'IP depuis les headers `x-forwarded-for` ou `x-real-ip`
   - Retourne l'IP en JSON

2. **`src/pages/client/PublicContractSignature.tsx`**
   - Remplacer l'appel a `api.ipify.org` par un appel a l'edge function `get-client-ip`
   - Garder `api.ipify.org` comme fallback secondaire
   - Conserver `"unknown"` comme dernier recours

### Detail technique

```text
Ordre de tentative :
1. Edge function get-client-ip (headers serveur)
2. api.ipify.org (service externe, fallback)
3. "unknown" (dernier recours)
```

### Impact
- Aucun changement sur les contrats deja signes
- Les futures signatures auront une IP fiable meme si le client a un ad-blocker
- Aucun autre composant modifie
