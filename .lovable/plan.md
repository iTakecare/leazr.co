
# Fix: "Failed to fetch" sur la generation du PDF signe

## Cause racine

La fonction `generate-signed-contract-pdf` a `verify_jwt = true` dans `supabase/config.toml`. Cela signifie que le gateway Supabase verifie le JWT sur **toutes** les requetes, y compris la requete **OPTIONS** (preflight CORS) envoyee automatiquement par le navigateur.

Le probleme : la requete OPTIONS ne contient **jamais** de header `Authorization`. Supabase la rejette avec un 401, le navigateur interprete cela comme un echec CORS, et le `fetch()` cote client lance `TypeError: Failed to fetch`.

Les autres contrats ne sont pas affectes car ils ont deja un `signed_contract_pdf_url` stocke en base — le client telecharge directement depuis le storage, sans appeler l'edge function. Le contrat `LOC-ITC-2026-02003` a `signed_contract_pdf_url = NULL`, donc il doit passer par l'edge function, et c'est la que le preflight echoue.

## Solution

Passer `verify_jwt = false` dans `config.toml` pour cette fonction. La validation d'authentification est deja implementee dans le code de la fonction (lignes 172-185 : extraction du bearer token, appel a `supabase.auth.getUser()`), donc la securite est preservee.

## Fichier modifie

**`supabase/config.toml`**

```text
Avant :
[functions.generate-signed-contract-pdf]
verify_jwt = true

Apres :
[functions.generate-signed-contract-pdf]
verify_jwt = false
```

## Impact

- Corrige le "Failed to fetch" pour ce contrat et tous les futurs contrats sans URL PDF pre-generee
- Aucun impact sur la securite : l'authentification est validee dans le code de la fonction
- Aucun changement dans le code de la fonction ni du client
