
# Remplacement de GoCardless par Zapier

## Vue d'ensemble

Suppression complète de l'intégration GoCardless (OAuth Partner, Edge Functions, webhooks, etc.) et remplacement par une intégration Zapier simple dans le panneau Intégrations.

---

## Éléments à supprimer

### Edge Functions (11 fonctions)

| Fonction | Description |
|----------|-------------|
| `gocardless-oauth-start` | Démarrage OAuth |
| `gocardless-oauth-callback` | Callback OAuth |
| `gocardless-create-mandate` | Création de mandat SEPA |
| `gocardless-complete-flow` | Finalisation du flux client |
| `gocardless-cancel-billing-request` | Annulation de demande |
| `gocardless-resend-mandate-link` | Renvoi du lien de signature |
| `gocardless-verification-status` | Vérification du statut |
| `gocardless-disconnect` | Déconnexion |
| `gocardless-reconcile` | Réconciliation des données |
| `gocardless-webhook` | Réception des webhooks |
| `_shared/gocardless/*` | Utilitaires partagés (5 fichiers) |

### Pages Frontend (5 pages)

| Page | Chemin |
|------|--------|
| `GoCardlessOAuthCallbackPage.tsx` | OAuth callback admin |
| `GoCardlessCompletePage.tsx` | Complétion flux client |
| `GoCardlessSuccessPage.tsx` | Page de succès client |
| `GoCardlessIntegrationCard.tsx` | Carte configuration |
| `GoCardlessStatusCard.tsx` | Statut dans détail contrat |

### Routes à supprimer (App.tsx)

- `/:companySlug/gocardless/complete`
- `/:companySlug/gocardless/success`
- `/:companySlug/gocardless/oauth/callback`

### Tables de base de données concernées

Les colonnes GoCardless dans la table `contracts` et les tables dédiées (`gocardless_connections`, `gocardless_oauth_states`, `gocardless_webhook_events`) devront être conservées pour l'historique, mais ne seront plus utilisées.

---

## Nouvelle intégration Zapier

### Composant : `ZapierIntegrationCard.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Zapier                                               [Config] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Automatisez vos workflows avec Zapier                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ URL du Webhook Zapier                                       │ │
│  │ [https://hooks.zapier.com/hooks/catch/...              ]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Événements à déclencher:                                    │ │
│  │ ☑ Nouveau contrat signé                                     │ │
│  │ ☑ Nouveau client créé                                       │ │
│  │ ☑ Nouvelle offre acceptée                                   │ │
│  │ ☐ Rappel de paiement                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Tester le webhook]                    [Sauvegarder]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fonctionnalités

1. **Configuration simple** : Saisie de l'URL webhook Zapier
2. **Sélection d'événements** : Choix des événements déclencheurs
3. **Test du webhook** : Envoi d'un payload de test
4. **Stockage** : URL et configuration en base de données

### Stockage de la configuration

Nouvelle table `zapier_integrations` :
- `id` (uuid)
- `company_id` (uuid, FK)
- `webhook_url` (text)
- `enabled_events` (jsonb) - liste des événements activés
- `is_active` (boolean)
- `last_triggered_at` (timestamp)
- `created_at` / `updated_at`

### Hook d'envoi vers Zapier

Fonction utilitaire côté client pour envoyer des événements :

```typescript
// src/utils/zapier.ts
export async function triggerZapierWebhook(
  companyId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  // Récupérer la config Zapier de la company
  // Vérifier si l'événement est activé
  // Envoyer le payload au webhook (mode no-cors)
}
```

---

## Modifications dans IntegrationsManager

L'entrée GoCardless sera remplacée par Zapier dans la catégorie "Automation" :

```typescript
{
  id: 'zapier',
  name: 'Zapier',
  description: 'Automatisez vos workflows avec 5000+ applications',
  logoUrl: 'https://logo.clearbit.com/zapier.com',
  status: 'available',
  category: 'Automation'
}
```

---

## Plan d'exécution

### Phase 1 : Suppression GoCardless

1. Supprimer les 11 dossiers Edge Functions GoCardless
2. Supprimer les 5 pages/composants Frontend
3. Retirer les 3 routes de `App.tsx`
4. Retirer l'import et l'entrée GoCardless de `IntegrationsManager.tsx`
5. Nettoyer les références dans `ContractDetail.tsx` et `CompanySettingsPage.tsx`

### Phase 2 : Création intégration Zapier

1. Créer la migration pour la table `zapier_integrations`
2. Créer `ZapierIntegrationCard.tsx`
3. Ajouter l'entrée Zapier dans `IntegrationsManager.tsx`
4. Créer l'utilitaire `triggerZapierWebhook`

### Phase 3 : Nettoyage

1. Supprimer les secrets Supabase liés à GoCardless (manuellement)
2. Conserver les tables GoCardless pour l'historique

---

## Détails techniques

### Structure des fichiers à créer

```
src/
├── components/settings/
│   └── ZapierIntegrationCard.tsx     # Nouvelle carte de config
├── utils/
│   └── zapier.ts                      # Utilitaire d'envoi webhook
```

### Structure des fichiers à supprimer

```
supabase/functions/
├── gocardless-oauth-start/
├── gocardless-oauth-callback/
├── gocardless-create-mandate/
├── gocardless-complete-flow/
├── gocardless-cancel-billing-request/
├── gocardless-resend-mandate-link/
├── gocardless-verification-status/
├── gocardless-disconnect/
├── gocardless-reconcile/
├── gocardless-webhook/
└── _shared/gocardless/

src/
├── components/
│   ├── settings/GoCardlessIntegrationCard.tsx
│   └── contracts/GoCardlessStatusCard.tsx
└── pages/
    ├── admin/GoCardlessOAuthCallbackPage.tsx
    └── client/
        ├── GoCardlessCompletePage.tsx
        └── GoCardlessSuccessPage.tsx
```

### Payload Zapier (exemple)

```json
{
  "event_type": "contract_signed",
  "timestamp": "2026-01-30T10:30:00Z",
  "company_id": "xxx",
  "data": {
    "contract_id": "xxx",
    "client_name": "Entreprise ABC",
    "monthly_payment": 299.00,
    "contract_start_date": "2026-02-01"
  }
}
```

---

## Impact sur les fonctionnalités existantes

| Fonctionnalité | Avant (GoCardless) | Après (Zapier) |
|----------------|--------------------| ---------------|
| Prélèvements SEPA | Automatiques via mandat | Manuel ou via Zap externe |
| Création mandat | Dans l'app | Via GoCardless Dashboard + Zap |
| Webhooks | Réception sécurisée HMAC | N/A (envoi uniquement) |
| Notifications | Via webhook GoCardless | Via Zap configurable |

## Secrets à supprimer (manuellement dans Supabase Dashboard)

- `GOCARDLESS_CLIENT_ID`
- `GOCARDLESS_CLIENT_SECRET`
- `GOCARDLESS_REDIRECT_URI`
- `GOCARDLESS_WEBHOOK_SECRET`
- `LEAZR_ENCRYPTION_KEY_32B`

