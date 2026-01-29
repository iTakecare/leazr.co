# Implémentation GoCardless - TERMINÉE ✅

## Statut des prérequis

| Élément | Statut |
|---------|--------|
| Secrets Supabase | ✅ Configurés |
| Plan approuvé | ✅ Validé |
| Migration DB | ✅ Exécutée |
| Edge Functions | ✅ Créées |
| Pages Frontend | ✅ Créées |
| Composant Admin | ✅ Créé |
| Intégration | ✅ Terminée |

## Colonnes ajoutées à `contracts`

- `gocardless_customer_id` - ID client GoCardless
- `gocardless_mandate_id` - ID mandat SEPA
- `gocardless_subscription_id` - ID abonnement mensuel
- `gocardless_mandate_status` - Statut du mandat
- `gocardless_mandate_created_at` - Date création mandat
- `gocardless_billing_request_id` - ID demande de facturation

## Edge Functions créées

| Fonction | Rôle | verify_jwt |
|----------|------|------------|
| `gocardless-create-mandate` | Création Billing Request + Flow | true |
| `gocardless-complete-flow` | Finalisation après redirection | false |
| `gocardless-webhook` | Réception événements GoCardless | false |

## Fichiers créés

- `supabase/functions/gocardless-create-mandate/index.ts`
- `supabase/functions/gocardless-complete-flow/index.ts`
- `supabase/functions/gocardless-webhook/index.ts`
- `src/pages/client/GoCardlessCompletePage.tsx`
- `src/pages/client/GoCardlessSuccessPage.tsx`
- `src/components/contracts/GoCardlessStatusCard.tsx`

## Fichiers modifiés

- `supabase/config.toml` - Configuration des 3 edge functions
- `src/App.tsx` - Routes `/:companySlug/gocardless/complete` et `/success`
- `src/pages/ContractDetail.tsx` - Import et ajout GoCardlessStatusCard

## Configuration Webhook GoCardless

Pour recevoir les événements, configurer dans le dashboard GoCardless :
- **URL webhook** : `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook`
- **Secret** : Utiliser la valeur de `GOCARDLESS_WEBHOOK_SECRET`

## Flux utilisateur

1. Admin clique sur "Configurer la domiciliation" dans le détail contrat
2. Redirection vers GoCardless (saisie IBAN, confirmation mandat)
3. Retour sur `/:companySlug/gocardless/complete`
4. Création automatique de la subscription mensuelle
5. Affichage page de succès
6. Webhooks mettent à jour le statut en temps réel
