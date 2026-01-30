

# Implémentation GoCardless Partner OAuth - Phase Suivante

## État actuel

Les tables de base de données sont créées. Il reste à :
1. Configurer les secrets Partner OAuth
2. Implémenter les edge functions OAuth
3. Refactorer les fonctions existantes pour multi-tenant
4. Créer l'interface utilisateur

---

## Phase 2 : Configuration des secrets

Ajout des secrets nécessaires dans Supabase :

| Secret | Valeur | Description |
|--------|--------|-------------|
| `GOCARDLESS_CLIENT_ID` | `ySXPUPLJeKP7jCF8lRuRxJEHxRDcVz_LNvIFty-MujcDbFWjh4Zy1qkJ5O-ItU0X` | Client ID Partner OAuth |
| `GOCARDLESS_CLIENT_SECRET` | `QxYHsNwO2H_VUS3Zsvc_zj8pqybgMvpod_ShUo3TvrIeqI1HwDeGpykfZ7GNT2Qr` | Client Secret Partner OAuth |
| `GOCARDLESS_REDIRECT_URI` | `https://leazr.co/itakecare/gocardless/complete` | URI de callback OAuth |
| `TOKEN_ENCRYPTION_KEY` | (à générer - 32 bytes hex) | Clé AES-256 pour chiffrer les tokens |
| `GOCARDLESS_WEBHOOK_SECRET` | `Ya_RQ99PAAtpz0YWAd866l4yuux7oSw_r04RWiwA` | Secret webhook Partner (mise à jour) |

---

## Phase 3 : Edge Functions OAuth

### 3.1 Helper de chiffrement - `_shared/tokenEncryption.ts`

Fonctions pour chiffrer/déchiffrer les access tokens :
- `encryptToken(token, key)` : Chiffre avec AES-256-GCM + IV aléatoire
- `decryptToken(encrypted, key)` : Déchiffre le token

### 3.2 `gocardless-oauth-start`

Démarre le flux OAuth Partner :
- Génère un token `state` aléatoire pour protection CSRF
- Stocke le state dans `gocardless_oauth_states` avec expiration (10 min)
- Construit l'URL d'autorisation GoCardless avec :
  - `client_id`, `redirect_uri`, `response_type=code`, `scope=read_write`, `state`
- Retourne l'URL pour redirection

### 3.3 `gocardless-oauth-callback`

Traite le callback OAuth :
- Valide le `state` token (protection CSRF)
- Échange le `code` contre un `access_token` via POST
- Extrait `organisation_id` de la réponse
- Chiffre le token avec AES-256-GCM
- Insère/met à jour `gocardless_connections`
- Marque le state comme utilisé

### 3.4 `gocardless-disconnect`

Déconnecte le compte GoCardless :
- Supprime le token chiffré
- Met à jour `status = 'revoked'`

### 3.5 `gocardless-verification-status`

Vérifie le statut du creditor :
- Appel API `GET /creditors` avec le token du tenant
- Lit `creditors[0].verification_status`
- Met à jour `gocardless_connections.verification_status`
- Retourne le statut et l'URL de vérification si nécessaire

---

## Phase 4 : Refactoring des edge functions existantes

### 4.1 `gocardless-create-mandate` (multi-tenant)

Modifications :
- Récupère `company_id` depuis le contrat
- Charge le token chiffré depuis `gocardless_connections`
- Déchiffre le token pour les appels API
- Crée/utilise `gocardless_end_customers` au lieu de stocker sur le contrat
- Stocke le billing request dans `gocardless_billing_request_flows`

### 4.2 `gocardless-complete-flow` (multi-tenant)

Modifications :
- Utilise le token du tenant via `company_id`
- Crée le mandat dans `gocardless_mandates`
- Crée la subscription dans `gocardless_subscriptions`
- Maintient la compatibilité avec les colonnes `contracts.gocardless_*`

### 4.3 `gocardless-webhook` (Partner routing)

Modifications :
- Utilise le nouveau secret webhook Partner
- Route les événements via `event.links.organisation`
- Identifie le tenant par `organisation_id` -> `gocardless_connections`
- Traitement idempotent via `gocardless_webhook_events`
- Met à jour les tables `gocardless_mandates`, `gocardless_payments`, `gocardless_subscriptions`

---

## Phase 5 : Interface utilisateur

### 5.1 Composant `GoCardlessIntegrationCard`

Affiche dans Settings > Intégrations :

**État non connecté :**
- Bouton "Connecter GoCardless"
- Sélecteur environnement (Sandbox/Live)
- Description des fonctionnalités

**État connecté :**
- Badge environnement (sandbox/live)
- Statut de vérification avec indicateur visuel
- CTA "Compléter la vérification" si `action_required`
- URL du webhook à configurer
- Organisation ID
- Bouton "Déconnecter"

### 5.2 Mise à jour `CompanySettingsPage`

Ajoute le composant `GoCardlessIntegrationCard` dans l'onglet "Intégrations"

### 5.3 Pages de callback OAuth

- `/itakecare/gocardless/oauth/callback` : Route pour traiter le retour OAuth
- Mise à jour de `GoCardlessCompletePage` pour gérer aussi le callback OAuth

---

## Phase 6 : Configuration webhook GoCardless

Instructions pour l'utilisateur dans le dashboard GoCardless :

1. Aller dans l'app Partner "Leazr - iTakecare"
2. Vérifier que le webhook est configuré sur :
   - URL : `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook`
   - Secret : `Ya_RQ99PAAtpz0YWAd866l4yuux7oSw_r04RWiwA`

---

## Fichiers à créer/modifier

### Nouveaux fichiers

1. `supabase/functions/_shared/tokenEncryption.ts`
2. `supabase/functions/gocardless-oauth-start/index.ts`
3. `supabase/functions/gocardless-oauth-callback/index.ts`
4. `supabase/functions/gocardless-disconnect/index.ts`
5. `supabase/functions/gocardless-verification-status/index.ts`
6. `src/components/settings/GoCardlessIntegrationCard.tsx`

### Fichiers à modifier

1. `supabase/functions/gocardless-create-mandate/index.ts` (refactor multi-tenant)
2. `supabase/functions/gocardless-complete-flow/index.ts` (refactor multi-tenant)
3. `supabase/functions/gocardless-webhook/index.ts` (Partner routing)
4. `supabase/config.toml` (nouvelles fonctions)
5. `src/pages/CompanySettingsPage.tsx` (ajouter le composant)
6. `src/App.tsx` (nouvelle route OAuth callback)

---

## Sécurité

- Tokens chiffrés AES-256-GCM avec IV aléatoire
- Protection CSRF via state token
- Validation de signature HMAC-SHA256 pour webhooks
- Scoping strict par `company_id` sur toutes les requêtes
- RLS policies actives sur toutes les tables

---

## Compatibilité arrière

Les colonnes `contracts.gocardless_*` seront maintenues et synchronisées :
- Permet une transition progressive
- Les contrats existants continuent de fonctionner
- Nouvelles données stockées dans les tables dédiées

