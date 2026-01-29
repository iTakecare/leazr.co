
# Implémentation GoCardless - Prêt à exécuter

## Statut des prérequis

| Élément | Statut |
|---------|--------|
| Secrets Supabase | ✅ Configurés |
| Plan approuvé | ✅ Validé |

## Étapes d'implémentation

### Étape 1 : Migration Base de Données

Ajouter les colonnes GoCardless à la table `contracts` :

```sql
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_customer_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_subscription_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_status TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_mandate_created_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS gocardless_billing_request_id TEXT;
```

### Étape 2 : Configuration config.toml

Ajouter la configuration des 3 edge functions avec `verify_jwt = false` pour webhook et complete-flow.

### Étape 3 : Edge Functions

1. **gocardless-create-mandate** - Création du Billing Request + Flow
2. **gocardless-complete-flow** - Finalisation après redirection client
3. **gocardless-webhook** - Réception des événements (mandats, paiements)

### Étape 4 : Pages Frontend

1. **GoCardlessCompletePage.tsx** - Page callback après GoCardless
2. **GoCardlessSuccessPage.tsx** - Page de confirmation finale

### Étape 5 : Composant Admin

**GoCardlessStatusCard.tsx** - Carte de statut dans le détail contrat

### Étape 6 : Intégration

1. Ajouter les routes dans `App.tsx`
2. Intégrer `GoCardlessStatusCard` dans `ContractDetail.tsx`

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/gocardless-create-mandate/index.ts` | Création billing request |
| `supabase/functions/gocardless-complete-flow/index.ts` | Finalisation flow |
| `supabase/functions/gocardless-webhook/index.ts` | Réception webhooks |
| `src/pages/client/GoCardlessCompletePage.tsx` | Page après redirection |
| `src/pages/client/GoCardlessSuccessPage.tsx` | Page succès |
| `src/components/contracts/GoCardlessStatusCard.tsx` | Carte statut admin |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajout routes `/:companySlug/gocardless/*` |
| `src/pages/ContractDetail.tsx` | Import et ajout GoCardlessStatusCard |
| `supabase/config.toml` | Configuration edge functions |
