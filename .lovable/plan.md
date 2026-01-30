

# Implémentation complète du flux SEPA Mandate GoCardless

## Vue d'ensemble

Cette implémentation ajoute un flux complet de domiciliation SEPA derrière le bloc existant `GoCardlessStatusCard` dans l'écran de détail de contrat. Le flux utilise le **Billing Request Flow** de GoCardless pour collecter l'IBAN de manière sécurisée sans jamais stocker les données bancaires dans Leazr.

---

## Architecture du flux

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Contract Detail Page                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    GoCardlessStatusCard                             │ │
│  │                                                                     │ │
│  │  sepaStatus = "none"                                                │ │
│  │    → "Aucune domiciliation configurée"                              │ │
│  │    → [Configurer la domiciliation]                                   │ │
│  │                                                                     │ │
│  │  sepaStatus = "pending"                                             │ │
│  │    → "Mandat SEPA en cours de validation"                           │ │
│  │    → Badge: "En attente de signature"                               │ │
│  │    → [Copier le lien] [Renvoyer] [Annuler]                          │ │
│  │                                                                     │ │
│  │  sepaStatus = "active"                                              │ │
│  │    → "Domiciliation SEPA active"                                    │ │
│  │    → Référence mandat, date signature                               │ │
│  │    → Info: prélèvements automatiques activés                        │ │
│  │                                                                     │ │
│  │  sepaStatus = "failed"                                              │ │
│  │    → Message d'erreur                                                │ │
│  │    → [Reconfigurer la domiciliation]                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 : Extension du schéma de données

### 1.1 Migration de la table `contracts`

Ajout des colonnes suivantes :

| Colonne | Type | Description |
|---------|------|-------------|
| `sepa_status` | `text` | État SEPA: `none`, `pending`, `active`, `failed` |
| `sepa_activated_at` | `timestamptz` | Date d'activation du mandat |
| `gocardless_billing_request_flow_id` | `text` | ID du Billing Request Flow |
| `gocardless_billing_request_flow_url` | `text` | URL du flux hébergé |

### 1.2 SQL de migration

```sql
-- Ajout des nouvelles colonnes
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS sepa_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS sepa_activated_at timestamptz,
ADD COLUMN IF NOT EXISTS gocardless_billing_request_flow_id text,
ADD COLUMN IF NOT EXISTS gocardless_billing_request_flow_url text;

-- Index pour les recherches par statut SEPA
CREATE INDEX IF NOT EXISTS idx_contracts_sepa_status ON contracts(sepa_status);

-- Mise à jour des contrats existants avec mandat actif
UPDATE contracts 
SET sepa_status = 'active', sepa_activated_at = gocardless_mandate_created_at
WHERE gocardless_mandate_id IS NOT NULL 
  AND gocardless_mandate_status = 'active';

-- Mise à jour des contrats avec mandat en attente
UPDATE contracts 
SET sepa_status = 'pending'
WHERE gocardless_mandate_id IS NULL 
  AND gocardless_billing_request_id IS NOT NULL
  AND gocardless_mandate_status IN ('pending_submission', 'submitted');

-- Mise à jour des contrats avec mandat échoué
UPDATE contracts 
SET sepa_status = 'failed'
WHERE gocardless_mandate_status IN ('failed', 'cancelled', 'expired');
```

---

## Phase 2 : Edge Functions

### 2.1 Modification de `gocardless-create-mandate`

Modifications nécessaires :

1. **Vérification préalable** du tenant GoCardless :
   - Vérifier que `gocardless_connections.status = 'active'`
   - Vérifier que `verification_status = 'successful'` (sinon refuser)

2. **Stockage enrichi** :
   - Sauvegarder `flow_url` dans `gocardless_billing_request_flows.flow_url`
   - Mettre à jour `contracts.sepa_status = 'pending'`
   - Mettre à jour `contracts.gocardless_billing_request_flow_id`
   - Mettre à jour `contracts.gocardless_billing_request_flow_url`

3. **Retourner** l'URL du flux dans la réponse

### 2.2 Nouvelle fonction : `gocardless-cancel-billing-request`

Endpoint pour annuler une demande de mandat en attente :

```typescript
// POST body: { contractId: string }
// Actions:
// 1. Vérifier que le contrat a un billing_request_id
// 2. Appeler l'API GoCardless pour annuler le billing request
// 3. Mettre à jour contracts.sepa_status = 'none'
// 4. Supprimer/marquer comme cancelled dans gocardless_billing_request_flows
```

### 2.3 Nouvelle fonction : `gocardless-resend-mandate-link`

Endpoint pour renvoyer le lien de signature :

```typescript
// POST body: { contractId: string, email?: string }
// Actions:
// 1. Récupérer le flow_url existant depuis contracts ou gocardless_billing_request_flows
// 2. Vérifier que le flow n'a pas expiré
// 3. Envoyer un email au client avec le lien
// 4. Retourner succès
```

### 2.4 Modification de `gocardless-webhook`

Ajouter le traitement des événements Billing Request :

```typescript
// Nouveaux événements à gérer :
case 'billing_requests':
  await handleBillingRequestEvent(supabase, action, links, event, companyId);
  break;

// Actions billing_requests :
// - fulfilled : Le client a complété le flux
//   → Mettre à jour gocardless_billing_request_flows.status = 'completed'
//   → Le mandat sera créé ensuite (événement mandates.created)
// - cancelled : Le billing request a été annulé
//   → Mettre à jour contracts.sepa_status = 'failed'
// - failed : Erreur dans le flux
//   → Mettre à jour contracts.sepa_status = 'failed'
```

Enrichir le traitement des mandats :

```typescript
// Quand mandates.active est reçu :
// 1. Trouver le contrat via gocardless_mandate_id
// 2. Mettre à jour contracts.sepa_status = 'active'
// 3. Mettre à jour contracts.sepa_activated_at = NOW()

// Quand mandates.cancelled/expired/failed est reçu :
// 1. Mettre à jour contracts.sepa_status = 'failed'
```

---

## Phase 3 : Refonte du composant UI

### 3.1 Nouveau `GoCardlessStatusCard.tsx`

Refonte complète du composant pour gérer les 4 états :

**État `none` (pas de mandat) :**
```
┌─────────────────────────────────────────┐
│ 💳 Domiciliation SEPA                   │
│ Prélèvement automatique via GoCardless  │
├─────────────────────────────────────────┤
│                                         │
│ Aucune domiciliation configurée.        │
│ Configurez un mandat SEPA pour          │
│ automatiser les prélèvements mensuels.  │
│                                         │
│ [🔗 Configurer la domiciliation]        │
│                                         │
└─────────────────────────────────────────┘
```

**État `pending` (en attente de signature) :**
```
┌─────────────────────────────────────────┐
│ 💳 Domiciliation SEPA   [⏳ En attente] │
│ Prélèvement automatique via GoCardless  │
├─────────────────────────────────────────┤
│                                         │
│ Mandat SEPA en cours de validation.     │
│ Le client doit signer le mandat.        │
│                                         │
│ Demande créée le: 30/01/2026            │
│                                         │
│ [📋 Copier le lien]                     │
│ [📧 Renvoyer le lien]                   │
│ [❌ Annuler la demande]                  │
│                                         │
└─────────────────────────────────────────┘
```

**État `active` (mandat actif) :**
```
┌─────────────────────────────────────────┐
│ 💳 Domiciliation SEPA   [✅ Actif]       │
│ Prélèvement automatique via GoCardless  │
├─────────────────────────────────────────┤
│                                         │
│ Référence: MD00123ABC...                │
│ Activé le: 15/01/2026                   │
│                                         │
│ ℹ️ Les prélèvements mensuels seront      │
│ collectés automatiquement.              │
│                                         │
└─────────────────────────────────────────┘
```

**État `failed` (échec/annulé) :**
```
┌─────────────────────────────────────────┐
│ 💳 Domiciliation SEPA   [🔴 Échoué]      │
│ Prélèvement automatique via GoCardless  │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ Le mandat SEPA a été annulé ou        │
│ a expiré. Reconfigurez la domiciliation │
│ pour réactiver les prélèvements.        │
│                                         │
│ [🔄 Reconfigurer la domiciliation]      │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 Nouvelles fonctionnalités du composant

| Fonction | Description |
|----------|-------------|
| `handleSetupMandate()` | Appelle `gocardless-create-mandate`, ouvre le flux |
| `handleCopyLink()` | Copie l'URL du flux dans le presse-papiers |
| `handleResendLink()` | Appelle `gocardless-resend-mandate-link` |
| `handleCancelRequest()` | Appelle `gocardless-cancel-billing-request` |
| `getSepaStatus()` | Détermine le statut à afficher (logique de mapping) |

### 3.3 Logique de détermination du statut

```typescript
const getSepaStatus = (contract): 'none' | 'pending' | 'active' | 'failed' => {
  // Priorité au champ sepa_status si présent
  if (contract.sepa_status) {
    return contract.sepa_status;
  }
  
  // Fallback sur gocardless_mandate_status pour compatibilité
  const status = contract.gocardless_mandate_status;
  if (!status || !contract.gocardless_mandate_id) {
    if (contract.gocardless_billing_request_id) {
      return 'pending';
    }
    return 'none';
  }
  
  if (status === 'active') return 'active';
  if (['pending_submission', 'submitted'].includes(status)) return 'pending';
  if (['failed', 'cancelled', 'expired'].includes(status)) return 'failed';
  
  return 'none';
};
```

---

## Phase 4 : Mise à jour des types et services

### 4.1 Mise à jour de `Contract` interface

```typescript
// src/services/contractService.ts
export interface Contract {
  // ... champs existants ...
  
  // Nouveaux champs SEPA
  sepa_status?: 'none' | 'pending' | 'active' | 'failed';
  sepa_activated_at?: string;
  gocardless_billing_request_flow_id?: string;
  gocardless_billing_request_flow_url?: string;
}
```

### 4.2 Mise à jour de `getContractById()`

Ajouter les nouveaux champs dans la sélection :

```typescript
const { data, error } = await supabase
  .from('contracts')
  .select(`
    *, 
    clients(...),
    offers!inner(...),
    contract_equipment(...)
  `)
  .eq('id', contractId)
  .single();
```

---

## Phase 5 : Configuration Supabase

### 5.1 Mise à jour de `supabase/config.toml`

Ajouter les nouvelles fonctions :

```toml
[functions.gocardless-cancel-billing-request]
verify_jwt = false

[functions.gocardless-resend-mandate-link]
verify_jwt = false
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/gocardless-cancel-billing-request/index.ts` | Annulation de demande de mandat |
| `supabase/functions/gocardless-resend-mandate-link/index.ts` | Renvoi du lien de signature |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/contracts/GoCardlessStatusCard.tsx` | Refonte complète pour 4 états |
| `src/services/contractService.ts` | Ajout des nouveaux champs Contract |
| `supabase/functions/gocardless-create-mandate/index.ts` | Vérification tenant, stockage flow_url |
| `supabase/functions/gocardless-webhook/index.ts` | Gestion billing_requests, sepa_status |
| `supabase/functions/_shared/gocardless/client.ts` | Méthode cancelBillingRequest() |
| `supabase/config.toml` | Nouvelles fonctions |

---

## Sécurité et Idempotence

- **Jamais de collecte IBAN** : Utilisation exclusive du Billing Request Flow hébergé
- **Webhooks idempotents** : Vérification via `gocardless_webhook_events` avant traitement
- **Scoping tenant** : Toutes les opérations incluent `company_id` dans les clauses WHERE
- **Vérification tenant** : Avant création de mandat, vérifier `verification_status = 'successful'`
- **Rate limiting** : Toutes les edge functions sont rate-limitées

---

## Tests à effectuer

1. **Flux complet** : Créer un mandat depuis l'écran contrat → signer → vérifier statut actif
2. **Annulation** : Créer un mandat → annuler avant signature → vérifier statut none
3. **Copie lien** : Vérifier que le lien copié fonctionne
4. **Webhook** : Simuler les événements `billing_requests.fulfilled`, `mandates.active`, `mandates.cancelled`
5. **Réconciliation** : Vérifier que le statut se met à jour après événement webhook

