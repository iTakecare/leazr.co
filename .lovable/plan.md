

# Integration GoCardless Partner OAuth - Multi-tenant

## Vue d'ensemble

Cette integration remplace l'implementation actuelle (token unique global) par une architecture **Partner OAuth** ou chaque tenant (company) Leazr peut connecter **son propre compte GoCardless**. Cela permet :

- Isolation complete des donnees par tenant
- Chaque tenant recoit ses paiements directement
- Gestion multi-environnement (sandbox/live) par tenant
- Webhooks routes via `organisation_id`

---

## 1. Modele de donnees

### 1.1 Nouvelle table : `gocardless_connections`

Stocke les connexions OAuth par tenant :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        | Identifiant unique                       |
| company_id                 | UUID (FK, unique)| Reference a companies                    |
| environment                | TEXT             | 'sandbox' ou 'live'                      |
| access_token_encrypted     | TEXT             | Token chiffre (AES-256-GCM)              |
| organisation_id            | TEXT (indexed)   | ID organisation GoCardless               |
| connected_at               | TIMESTAMPTZ      | Date de connexion                        |
| status                     | TEXT             | connected, revoked, error                |
| verification_status        | TEXT             | successful, in_review, action_required   |
| verification_checked_at    | TIMESTAMPTZ      | Derniere verification                    |
| created_at                 | TIMESTAMPTZ      | Date creation                            |
| updated_at                 | TIMESTAMPTZ      | Date modification                        |
+----------------------------+------------------+------------------------------------------+
```

### 1.2 Nouvelle table : `gocardless_end_customers`

Clients finaux pour les mandats SEPA :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        | Identifiant unique                       |
| company_id                 | UUID (FK)        | Tenant proprietaire                      |
| client_id                  | UUID (FK)        | Reference a clients (optionnel)          |
| name                       | TEXT             | Nom du client                            |
| email                      | TEXT             | Email du client                          |
| address_line1              | TEXT             | Adresse ligne 1                          |
| city                       | TEXT             | Ville                                    |
| postal_code                | TEXT             | Code postal                              |
| country_code               | TEXT             | Code pays (BE, FR, ...)                  |
| gocardless_customer_id     | TEXT             | ID customer chez GoCardless              |
| metadata                   | JSONB            | Donnees supplementaires                  |
| created_at                 | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

### 1.3 Nouvelle table : `gocardless_mandates`

Mandats SEPA :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        |                                          |
| company_id                 | UUID (FK)        |                                          |
| end_customer_id            | UUID (FK)        | Reference gocardless_end_customers       |
| contract_id                | UUID (FK)        | Reference contracts (optionnel)          |
| gocardless_mandate_id      | TEXT (unique)    | ID mandat chez GoCardless                |
| status                     | TEXT             | pending, active, cancelled, failed...    |
| scheme                     | TEXT             | sepa_core, bacs, etc.                    |
| last_event_at              | TIMESTAMPTZ      |                                          |
| created_at                 | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

### 1.4 Nouvelle table : `gocardless_billing_request_flows`

Flux de demande de mandat :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        |                                          |
| company_id                 | UUID (FK)        |                                          |
| end_customer_id            | UUID (FK)        |                                          |
| billing_request_id         | TEXT             | ID billing_request GoCardless            |
| billing_request_flow_id    | TEXT             | ID flow GoCardless                       |
| flow_url                   | TEXT             | URL d'autorisation                       |
| status                     | TEXT             | created, flow_visited, fulfilled...      |
| expires_at                 | TIMESTAMPTZ      |                                          |
| created_at                 | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

### 1.5 Nouvelle table : `gocardless_payments`

Paiements SEPA :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        |                                          |
| company_id                 | UUID (FK)        |                                          |
| end_customer_id            | UUID (FK)        |                                          |
| mandate_id                 | UUID (FK)        | Reference gocardless_mandates            |
| gocardless_payment_id      | TEXT             | ID payment GoCardless                    |
| amount_cents               | INTEGER          | Montant en centimes                      |
| currency                   | TEXT             | EUR                                      |
| charge_date                | DATE             | Date de prelevement                      |
| status                     | TEXT             | pending, confirmed, paid_out, failed...  |
| idempotency_key            | TEXT (unique)    | Cle d'idempotence                        |
| description                | TEXT             |                                          |
| metadata                   | JSONB            |                                          |
| created_at                 | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

### 1.6 Nouvelle table : `gocardless_subscriptions`

Abonnements mensuels :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        |                                          |
| company_id                 | UUID (FK)        |                                          |
| mandate_id                 | UUID (FK)        | Reference gocardless_mandates            |
| contract_id                | UUID (FK)        | Reference contracts (optionnel)          |
| gocardless_subscription_id | TEXT             | ID subscription GoCardless               |
| amount_cents               | INTEGER          | Montant mensuel en centimes              |
| currency                   | TEXT             | EUR                                      |
| interval_unit              | TEXT             | monthly, weekly, yearly                  |
| day_of_month               | INTEGER          | Jour du mois (1-28)                      |
| start_date                 | DATE             | Date de debut                            |
| status                     | TEXT             | active, cancelled, finished              |
| metadata                   | JSONB            |                                          |
| created_at                 | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

### 1.7 Nouvelle table : `gocardless_webhook_events`

Idempotence des webhooks :

```text
+----------------------------+------------------+------------------------------------------+
| Colonne                    | Type             | Description                              |
+----------------------------+------------------+------------------------------------------+
| id                         | UUID (PK)        |                                          |
| gocardless_event_id        | TEXT (unique)    | ID event GoCardless                      |
| company_id                 | UUID (FK)        | Tenant identifie via organisation_id     |
| resource_type              | TEXT             | mandates, payments, subscriptions...     |
| action                     | TEXT             | created, cancelled, failed...            |
| received_at                | TIMESTAMPTZ      |                                          |
+----------------------------+------------------+------------------------------------------+
```

---

## 2. Edge Functions

### 2.1 `gocardless-oauth-start`

Demarre le flux OAuth Partner :

- Genere un `state` token (CSRF) stocke en session/DB
- Redirige vers GoCardless authorize avec :
  - `client_id`, `redirect_uri`, `response_type=code`, `scope=read_write`, `state`
- URL Sandbox : `https://connect-sandbox.gocardless.com/oauth/authorize`
- URL Live : `https://connect.gocardless.com/oauth/authorize`

### 2.2 `gocardless-oauth-callback`

Recoit le callback OAuth :

- Valide le `state` (protection CSRF)
- Echange le `code` contre un `access_token` via POST token endpoint
- Chiffre le token avec AES-256-GCM avant stockage
- Stocke `organisation_id` (retourne avec le token)
- Cree/met a jour `gocardless_connections` avec status=connected
- Redirige vers la page Settings avec succes/echec

### 2.3 `gocardless-disconnect`

Deconnecte le compte GoCardless :

- Marque la connexion status=revoked
- Supprime/rotation du token chiffre

### 2.4 `gocardless-verification-status`

Verifie le statut de verification du creditor :

- Appel API `GET /creditors` avec le token du tenant
- Lit `creditors[0].verification_status`
- Met a jour `gocardless_connections.verification_status`
- Retourne le statut et l'URL de verification si necessaire

### 2.5 `gocardless-create-mandate` (refactored)

Cree un mandat via Billing Request Flow :

- Recupere le token chiffre du tenant via `company_id`
- Cree/recupere `gocardless_end_customers`
- Cree un Billing Request + Billing Request Flow
- Stocke le flow dans `gocardless_billing_request_flows`
- Retourne l'URL d'autorisation

### 2.6 `gocardless-complete-flow` (refactored)

Finalise le flux de mandat :

- Recupere le billing request pour obtenir mandate_id
- Cree le mandat dans `gocardless_mandates`
- Optionnel : cree une subscription

### 2.7 `gocardless-create-payment`

Cree un paiement one-off :

- Verifie que le tenant a un mandat actif
- Genere une cle d'idempotence
- Cree le paiement via API GoCardless
- Stocke dans `gocardless_payments`

### 2.8 `gocardless-webhook` (refactored)

Recoit et traite les webhooks :

- Verifie la signature HMAC-SHA256
- Pour chaque event (jusqu'a 250) :
  - Identifie le tenant via `event.links.organisation` -> `gocardless_connections.organisation_id`
  - Skip si `gocardless_event_id` deja traite
  - Met a jour l'entite correspondante (mandate, payment, subscription)
  - Insere dans `gocardless_webhook_events`
- Repond 200 rapidement

---

## 3. Secrets Supabase

Les secrets existants seront remplaces/completes :

| Secret | Description |
|--------|-------------|
| `GOCARDLESS_CLIENT_ID` | Partner client ID (OAuth app) |
| `GOCARDLESS_CLIENT_SECRET` | Partner client secret |
| `GOCARDLESS_REDIRECT_URI` | URL de callback OAuth |
| `GOCARDLESS_WEBHOOK_SECRET` | Secret pour verification webhook |
| `GOCARDLESS_ENV` | Environnement global (SANDBOX/LIVE) |
| `TOKEN_ENCRYPTION_KEY` | Cle AES-256 pour chiffrer les tokens |

---

## 4. Composants UI

### 4.1 Page Settings > Integrations > GoCardless

Composant `GoCardlessIntegrationCard` :

- **Non connecte** : Bouton "Connecter GoCardless" (demarre OAuth)
- **Connecte** : 
  - Badge environnement (sandbox/live)
  - Statut de verification avec CTA si `action_required`
  - URL du webhook a configurer dans GoCardless
  - Bouton "Deconnecter"

### 4.2 Composant `GoCardlessStatusCard` (mise a jour)

Adapte pour utiliser les nouvelles tables :

- Affiche le statut du mandat depuis `gocardless_mandates`
- Affiche les paiements depuis `gocardless_payments`

### 4.3 Pages de callback OAuth

- `/api/gocardless/oauth/callback` : Traite le retour OAuth
- `/gocardless/connection-success` : Page de confirmation

---

## 5. Chiffrement des tokens

Helper `tokenEncryption.ts` dans `_shared/` :

```text
encryptToken(token: string, key: string) -> string (base64)
decryptToken(encrypted: string, key: string) -> string
```

Utilise AES-256-GCM avec IV aleatoire, disponible via Web Crypto API.

---

## 6. Flux d'architecture

```text
   +----------------+                     +------------------+
   |    Tenant      |                     |    GoCardless    |
   |   (Company)    |                     |    (Partner)     |
   +-------+--------+                     +--------+---------+
           |                                       |
           | 1. Click "Connect GoCardless"         |
           +-------------------------------------->|
           |                                       |
           | 2. OAuth authorize (client_id, state) |
           |<--------------------------------------+
           |                                       |
           | 3. User authorizes access             |
           +-------------------------------------->|
           |                                       |
           | 4. Callback with code                 |
           |<--------------------------------------+
           |                                       |
           | 5. Exchange code for token            |
           +-------------------------------------->|
           |                                       |
           | 6. Return access_token + org_id       |
           |<--------------------------------------+
           |                                       |
           | 7. Store encrypted token in DB        |
           |                                       |
   +-------+--------+                              |
   |  Create Mandate|                              |
   +-------+--------+                              |
           |                                       |
           | 8. Create Billing Request (per-tenant)|
           +-------------------------------------->|
           |                                       |
           | 9. Return flow URL                    |
           |<--------------------------------------+
           |                                       |
           | 10. End customer completes flow       |
           +-------------------------------------->|
           |                                       |
           | 11. Webhook: mandate.created          |
           |<--------------------------------------+
           |                                       |
           | (routed via organisation_id)          |
           |                                       |
```

---

## 7. Details techniques

### 7.1 API GoCardless Base URLs

| Environnement | Authorize | Token | API |
|---------------|-----------|-------|-----|
| Sandbox | connect-sandbox.gocardless.com/oauth/authorize | connect-sandbox.gocardless.com/oauth/access_token | api-sandbox.gocardless.com |
| Live | connect.gocardless.com/oauth/authorize | connect.gocardless.com/oauth/access_token | api.gocardless.com |

### 7.2 URLs de verification creditor

| Environnement | URL |
|---------------|-----|
| Sandbox | https://verify-sandbox.gocardless.com |
| Live | https://verify.gocardless.com |

### 7.3 Routing des webhooks Partner

Les webhooks Partner incluent `links.organisation` dans chaque event. Ce champ permet de router l'event vers le bon tenant :

```text
event.links.organisation -> gocardless_connections.organisation_id -> company_id
```

---

## 8. Migration des donnees existantes

Les colonnes actuelles sur `contracts` (`gocardless_*`) seront conservees temporairement pour compatibilite arriere. Une migration progressive vers les nouvelles tables sera effectuee.

---

## 9. Securite

- Tokens chiffres AES-256-GCM avec cle secrete serveur uniquement
- Jamais de token expose cote client
- Scoping strict par tenant (company_id) sur toutes les requetes
- Validation CSRF via state token pour OAuth
- Signature HMAC-SHA256 pour webhooks
- RLS policies sur toutes les nouvelles tables

---

## 10. Etapes d'implementation

1. **Phase 1 - Base de donnees**
   - Creer les 7 nouvelles tables avec RLS
   - Ajouter les index necessaires

2. **Phase 2 - Secrets & Chiffrement**
   - Ajouter les nouveaux secrets Supabase
   - Creer le helper de chiffrement

3. **Phase 3 - Edge Functions OAuth**
   - `gocardless-oauth-start`
   - `gocardless-oauth-callback`
   - `gocardless-disconnect`
   - `gocardless-verification-status`

4. **Phase 4 - Edge Functions Operations**
   - Refactor `gocardless-create-mandate`
   - Refactor `gocardless-complete-flow`
   - `gocardless-create-payment`
   - Refactor `gocardless-webhook`

5. **Phase 5 - UI**
   - Page Settings > Integrations > GoCardless
   - Pages de callback et succes OAuth
   - Mise a jour GoCardlessStatusCard

6. **Phase 6 - Tests & Documentation**
   - Tests sandbox
   - Documentation utilisateur

