
# Plan : Intégration GoCardless pour les domiciliations SEPA

## Objectif

Automatiser la mise en place des mandats de domiciliation SEPA pour les contrats en propre (self-leasing) via GoCardless, afin de prélever automatiquement les mensualités.

## Architecture Globale

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            FLUX GOCARDLESS                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. CONTRAT SIGNÉ                                                                │
│     │                                                                            │
│     ▼                                                                            │
│  2. EDGE FUNCTION: gocardless-create-mandate                                     │
│     │   - Crée un Billing Request                                                │
│     │   - Crée un Billing Request Flow                                           │
│     │   - Retourne authorisation_url                                             │
│     ▼                                                                            │
│  3. CLIENT REDIRIGÉ VERS GOCARDLESS                                              │
│     │   - Page hébergée par GoCardless                                           │
│     │   - Confirmation coordonnées bancaires                                     │
│     │   - Signature du mandat SEPA                                               │
│     ▼                                                                            │
│  4. REDIRECTION VERS: /{companySlug}/gocardless/complete?flow_id=BRF123          │
│     │   - Page de confirmation côté Leazr                                        │
│     │   - Edge function complète le flow                                         │
│     │   - Crée la subscription mensuelle                                         │
│     ▼                                                                            │
│  5. WEBHOOKS GOCARDLESS                                                          │
│        - mandate.created / mandate.active                                        │
│        - payment.created / payment.confirmed / payment.failed                    │
│        - Mise à jour statut contrat                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Informations pour GoCardless (screenshot)

Voici les informations à renseigner dans le formulaire GoCardless "Créer une application partenaire" :

| Champ | Valeur |
|-------|--------|
| **Nom de l'application** | iTakecare / Leazr |
| **Logo de l'application** | Logo iTakecare (PNG, max 500ko) |
| **Description** | Solution de leasing d'équipements informatiques reconditionnés |
| **URL de la page d'accueil** | `https://leazr.co` ou `https://itakecare.leazr.co` |
| **URL de redirection** | `https://leazr.co/{companySlug}/gocardless/complete` |
| **URL de destination après intégration** | `https://leazr.co/{companySlug}/gocardless/success` |
| **URL du webhook** | `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook` |

## Composants à créer

### 1. Base de données - Nouvelles colonnes

**Table `contracts`** - Ajout de colonnes GoCardless :

| Colonne | Type | Description |
|---------|------|-------------|
| `gocardless_customer_id` | TEXT | ID client GoCardless (CU...) |
| `gocardless_mandate_id` | TEXT | ID mandat SEPA (MD...) |
| `gocardless_subscription_id` | TEXT | ID subscription (SB...) |
| `gocardless_mandate_status` | TEXT | Statut: pending/submitted/active/failed/cancelled |
| `gocardless_mandate_created_at` | TIMESTAMPTZ | Date création mandat |
| `gocardless_billing_request_id` | TEXT | ID Billing Request (BRQ...) |

### 2. Edge Functions

#### A. `gocardless-create-mandate`

Crée un Billing Request + Flow pour un contrat signé.

**Input:**
```json
{
  "contractId": "uuid",
  "returnUrl": "https://leazr.co/itakecare/gocardless/complete"
}
```

**Output:**
```json
{
  "success": true,
  "authorisationUrl": "https://pay.gocardless.com/billing/static/flow?id=BRF123",
  "billingRequestId": "BRQ123",
  "flowId": "BRF123"
}
```

#### B. `gocardless-complete-flow`

Appelé après redirection depuis GoCardless pour finaliser le mandat et créer la subscription.

**Input:**
```json
{
  "flowId": "BRF123",
  "contractId": "uuid"
}
```

**Actions:**
1. Appelle `billingRequestFlows.complete()`
2. Récupère le `mandate_id`
3. Crée une subscription mensuelle
4. Met à jour le contrat avec les IDs

#### C. `gocardless-webhook`

Reçoit les événements GoCardless.

**Événements traités:**
- `mandates` : created, submitted, active, failed, cancelled
- `payments` : created, confirmed, paid_out, failed, late_failure
- `subscriptions` : created, cancelled, finished

#### D. `gocardless-create-payment` (optionnel)

Pour créer un paiement ponctuel (par ex. premier paiement ou régularisation).

### 3. Pages Frontend

#### A. `GoCardlessCompletePage.tsx`

**Route:** `/:companySlug/gocardless/complete`

Page de destination après validation du mandat sur GoCardless.

**Fonctionnalités:**
- Récupère `flow_id` depuis URL
- Appelle edge function `gocardless-complete-flow`
- Affiche confirmation ou erreur
- Redirige vers page de succès

#### B. `GoCardlessSuccessPage.tsx`

**Route:** `/:companySlug/gocardless/success`

Page de confirmation finale.

**Contenu:**
- Message de confirmation
- Récapitulatif du mandat
- Dates prévisionnelles des prélèvements
- Lien vers espace client

#### C. `GoCardlessStatusCard.tsx`

Composant dans la page ContractDetail pour :
- Voir le statut du mandat
- Initier la mise en place du mandat si absent
- Voir l'historique des paiements

### 4. Intégration dans le flux existant

**Option A - Automatique après signature:**
Modifier `PublicContractSignature.tsx` pour rediriger automatiquement vers GoCardless après signature.

**Option B - Manuel depuis l'admin:**
Bouton dans `ContractSelfLeasingCard.tsx` pour initier le mandat GoCardless.

## Secrets à configurer

| Secret | Description |
|--------|-------------|
| `GOCARDLESS_ACCESS_TOKEN` | Token API GoCardless (live ou sandbox) |
| `GOCARDLESS_WEBHOOK_SECRET` | Secret pour valider les signatures webhook |
| `GOCARDLESS_ENVIRONMENT` | `sandbox` ou `live` |

## Fichiers à créer/modifier

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `supabase/functions/gocardless-create-mandate/index.ts` | Création billing request |
| `supabase/functions/gocardless-complete-flow/index.ts` | Finalisation du flow |
| `supabase/functions/gocardless-webhook/index.ts` | Réception webhooks |
| `src/pages/client/GoCardlessCompletePage.tsx` | Page après redirection GC |
| `src/pages/client/GoCardlessSuccessPage.tsx` | Page succès finale |
| `src/components/contracts/GoCardlessStatusCard.tsx` | Statut dans admin |

### Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajouter routes `/gocardless/*` |
| `src/pages/ContractDetail.tsx` | Intégrer GoCardlessStatusCard |
| `supabase/config.toml` | Ajouter config edge functions |
| Migration SQL | Nouvelles colonnes `gocardless_*` |

## Exemple de code Edge Function

```typescript
// gocardless-create-mandate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GC_BASE_URL = Deno.env.get("GOCARDLESS_ENVIRONMENT") === "live"
  ? "https://api.gocardless.com"
  : "https://api-sandbox.gocardless.com";

serve(async (req) => {
  // ... CORS handling ...
  
  const { contractId, returnUrl } = await req.json();
  const accessToken = Deno.env.get("GOCARDLESS_ACCESS_TOKEN");
  
  // 1. Récupérer le contrat et client
  const contract = await supabase.from("contracts").select("*, clients(*)").eq("id", contractId).single();
  
  // 2. Créer Billing Request
  const billingRequest = await fetch(`${GC_BASE_URL}/billing_requests`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      billing_requests: {
        mandate_request: {
          scheme: "sepa_core",
          currency: "EUR"
        },
        metadata: {
          contract_id: contractId
        }
      }
    })
  });
  
  // 3. Créer Billing Request Flow
  const flow = await fetch(`${GC_BASE_URL}/billing_request_flows`, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: returnUrl,
        exit_uri: returnUrl + "?cancelled=true",
        links: {
          billing_request: billingRequest.id
        }
      }
    })
  });
  
  // 4. Retourner l'URL d'autorisation
  return new Response(JSON.stringify({
    success: true,
    authorisationUrl: flow.authorisation_url,
    billingRequestId: billingRequest.id,
    flowId: flow.id
  }));
});
```

## Prochaines étapes

1. **Création compte GoCardless** : Créer l'application partenaire avec les URLs ci-dessus
2. **Migration DB** : Ajouter les colonnes `gocardless_*` à la table contracts
3. **Secrets** : Configurer `GOCARDLESS_ACCESS_TOKEN` et `GOCARDLESS_WEBHOOK_SECRET`
4. **Edge Functions** : Implémenter les 3 edge functions
5. **Frontend** : Créer les pages de callback et le composant de statut
6. **Tests** : Tester en sandbox avant passage en production

## Notes importantes

- **Schéma SEPA** : Pour la Belgique, utiliser `sepa_core` (pas `bacs` qui est UK)
- **Devise** : EUR (pas GBP)
- **Webhooks** : Essentiels pour suivre les statuts des paiements en temps réel
- **Sandbox** : Toujours tester en sandbox d'abord avec des IBAN de test
