
# Plan d'Implementation : Integration GoCardless pour Domiciliations SEPA

## Resume

Ce plan detaille l'implementation complete de l'integration GoCardless pour automatiser les prelevements SEPA sur les contrats self-leasing. L'integration comprend 3 edge functions, 2 pages publiques, 1 composant admin, et une migration de base de donnees.

## Secrets a Configurer dans Supabase

Les secrets suivants doivent etre ajoutes dans Supabase Edge Functions Settings :

| Secret | Valeur |
|--------|--------|
| GOCARDLESS_ACCESS_TOKEN | live_UC4OP8KRQ_62OpXW2rtN_b6eDrAug0t3gCjqVbs5 |
| GOCARDLESS_WEBHOOK_SECRET | gc_webhook_leazr_itakecare_2026_Xk9mP4nQ7rW2vBc8 |
| GOCARDLESS_ENVIRONMENT | live |

## 1. Migration Base de Donnees

### Table `contracts` - Nouvelles colonnes

```sql
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_customer_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_subscription_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_status TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_created_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_billing_request_id TEXT;
```

## 2. Edge Functions

### 2.1 `gocardless-create-mandate`

**Fichier:** `supabase/functions/gocardless-create-mandate/index.ts`

**Role:** Cree un Billing Request + Flow pour rediriger le client vers GoCardless.

**Entree:**
```json
{
  "contractId": "uuid",
  "returnUrl": "https://leazr.co/itakecare/gocardless/complete"
}
```

**Sortie:**
```json
{
  "success": true,
  "authorisationUrl": "https://pay.gocardless.com/...",
  "billingRequestId": "BRQ...",
  "flowId": "BRF..."
}
```

**Logique:**
1. Recuperer le contrat et les informations client
2. Creer un customer GoCardless (ou reutiliser existant)
3. Creer un Billing Request avec scheme SEPA
4. Creer un Billing Request Flow
5. Stocker le billing_request_id dans le contrat
6. Retourner l'URL d'autorisation

---

### 2.2 `gocardless-complete-flow`

**Fichier:** `supabase/functions/gocardless-complete-flow/index.ts`

**Role:** Finalise le flow apres redirection, cree la subscription.

**Entree:**
```json
{
  "billingRequestFlowId": "BRF...",
  "contractId": "uuid"
}
```

**Logique:**
1. Recuperer le Billing Request associe
2. Extraire customer_id et mandate_id
3. Creer une subscription mensuelle
4. Mettre a jour le contrat avec tous les IDs GoCardless
5. Mettre a jour le statut du mandat

---

### 2.3 `gocardless-webhook`

**Fichier:** `supabase/functions/gocardless-webhook/index.ts`

**Role:** Recevoir et traiter les evenements GoCardless.

**Evenements geres:**
- `mandates` : submitted, active, failed, cancelled, expired
- `payments` : created, confirmed, paid_out, failed, late_failure, charged_back
- `subscriptions` : created, cancelled, finished

**Securite:**
- Validation de la signature webhook via HMAC-SHA256
- verify_jwt = false (appel externe)

---

## 3. Pages Frontend

### 3.1 `GoCardlessCompletePage.tsx`

**Fichier:** `src/pages/client/GoCardlessCompletePage.tsx`

**Route:** `/:companySlug/gocardless/complete`

**Fonctionnalites:**
- Recupere `billing_request_flow_id` depuis les query params
- Affiche un loader pendant le traitement
- Appelle `gocardless-complete-flow`
- Affiche confirmation ou erreur
- Redirige vers success ou affiche message d'erreur

---

### 3.2 `GoCardlessSuccessPage.tsx`

**Fichier:** `src/pages/client/GoCardlessSuccessPage.tsx`

**Route:** `/:companySlug/gocardless/success`

**Contenu:**
- Message de confirmation avec icone succes
- Recapitulatif : montant mensuel, prochaine echeance
- Informations sur le mandat SEPA
- Lien de retour ou fermeture

---

## 4. Composant Admin

### 4.1 `GoCardlessStatusCard.tsx`

**Fichier:** `src/components/contracts/GoCardlessStatusCard.tsx`

**Integration:** Ajoute dans `ContractDetail.tsx` (sidebar, apres ContractSelfLeasingCard)

**Fonctionnalites:**
- Affiche le statut du mandat GoCardless
- Badge colore selon le statut (pending/active/failed)
- Bouton "Mettre en place la domiciliation" si pas de mandat
- Informations sur la subscription si active
- Historique des derniers paiements (futur)

---

## 5. Modifications de Fichiers Existants

### 5.1 `src/App.tsx`

Ajouter les routes GoCardless :

```tsx
// Apres les routes contract/:token/sign (ligne ~200)
<Route path="/:companySlug/gocardless/complete" element={<GoCardlessCompletePage />} />
<Route path="/:companySlug/gocardless/success" element={<GoCardlessSuccessPage />} />
```

---

### 5.2 `supabase/config.toml`

Ajouter la configuration des 3 edge functions :

```toml
[functions.gocardless-create-mandate]
verify_jwt = true

[functions.gocardless-complete-flow]
verify_jwt = false

[functions.gocardless-webhook]
verify_jwt = false
```

---

### 5.3 `src/pages/ContractDetail.tsx`

Importer et ajouter le composant GoCardlessStatusCard dans la sidebar :

```tsx
import GoCardlessStatusCard from "@/components/contracts/GoCardlessStatusCard";

// Dans la sidebar, apres ContractSelfLeasingCard
{contract.is_self_leasing && (
  <GoCardlessStatusCard 
    contract={contract}
    onUpdate={refetch}
  />
)}
```

---

## 6. Flux Utilisateur

```text
ADMIN                          CLIENT                         GOCARDLESS
  |                              |                                |
  |-- Clique "Domiciliation" --->|                                |
  |                              |                                |
  |<-- gocardless-create-mandate |                                |
  |        (authorisationUrl) ---|                                |
  |                              |                                |
  |                              |-- Redirige vers GC ----------->|
  |                              |                                |
  |                              |   Page hebergee GoCardless     |
  |                              |   - Saisie IBAN                |
  |                              |   - Confirmation mandat        |
  |                              |                                |
  |                              |<-- Redirection complete -------|
  |                              |                                |
  |                              |-- GoCardlessCompletePage       |
  |                              |   (appelle complete-flow)      |
  |                              |                                |
  |                              |<-- GoCardlessSuccessPage       |
  |                              |                                |
  |<-- Webhook: mandate.active --|--------------------------------|
  |                              |                                |
  |-- Statut mis a jour          |                                |
  |   dans ContractDetail        |                                |
```

---

## 7. Structure des Fichiers

### Nouveaux fichiers a creer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/gocardless-create-mandate/index.ts` | Creation du billing request |
| `supabase/functions/gocardless-complete-flow/index.ts` | Finalisation et creation subscription |
| `supabase/functions/gocardless-webhook/index.ts` | Reception des evenements |
| `src/pages/client/GoCardlessCompletePage.tsx` | Page callback apres GC |
| `src/pages/client/GoCardlessSuccessPage.tsx` | Page de confirmation |
| `src/components/contracts/GoCardlessStatusCard.tsx` | Carte statut dans admin |

### Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajout des 2 routes GoCardless |
| `src/pages/ContractDetail.tsx` | Import et ajout GoCardlessStatusCard |
| `supabase/config.toml` | Configuration des 3 edge functions |

---

## 8. Considerations Techniques

### API GoCardless
- **Environnement:** Production (live)
- **Base URL:** `https://api.gocardless.com`
- **Version API:** 2015-07-06
- **Schema SEPA:** sepa_core (Europe)
- **Devise:** EUR

### Securite Webhook
- Signature HMAC-SHA256 dans le header `Webhook-Signature`
- Format: `{timestamp}-{signature}`
- Verification obligatoire avant traitement

### Gestion des Erreurs
- Retry automatique pour les erreurs reseau
- Logs detailles dans les edge functions
- Messages utilisateur conviviaux en francais

---

## 9. Ordre d'Implementation

1. **Migration DB** - Ajouter les colonnes gocardless_*
2. **Config.toml** - Declarer les 3 edge functions
3. **Edge functions** - Implementer dans l'ordre :
   - gocardless-create-mandate
   - gocardless-complete-flow
   - gocardless-webhook
4. **Pages frontend** - GoCardlessCompletePage, GoCardlessSuccessPage
5. **Composant admin** - GoCardlessStatusCard
6. **Integration** - Modifier App.tsx et ContractDetail.tsx
7. **Tests** - Tester le flux complet en sandbox puis production
