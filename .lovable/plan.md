

# Plan : Création du mandat ET de l'abonnement en une seule opération

## Objectif
Quand l'administrateur soumet le formulaire SEPA avec l'IBAN, le système doit automatiquement :
1. Créer le client Mollie
2. Créer le mandat SEPA direct (avec l'IBAN)
3. **Créer l'abonnement de prélèvement récurrent** (subscription)

Le tout en une seule action, sans étapes supplémentaires.

## Solution technique

### Nouvelle action Edge Function : `setup_sepa_complete`

Créer une action unifiée dans l'Edge Function `mollie-sepa/index.ts` qui enchaîne les 3 étapes :

```text
┌─────────────────────────────────────────────────────────────────┐
│  Action: setup_sepa_complete                                    │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /customers          → Créer client Mollie              │
│  2. POST /customers/{id}/mandates → Créer mandat SEPA direct    │
│  3. POST /customers/{id}/subscriptions → Créer abonnement       │
│  4. UPDATE contracts         → Sauvegarder tous les IDs         │
└─────────────────────────────────────────────────────────────────┘
```

### Paramètres requis

| Paramètre | Description |
|-----------|-------------|
| `name` | Nom complet du client |
| `email` | Email du client |
| `consumer_name` | Nom du titulaire du compte (pour le mandat) |
| `iban` | IBAN du compte bancaire |
| `bic` | BIC (optionnel) |
| `amount` | Montant mensuel en euros |
| `times` | Nombre de mois de prélèvement |
| `start_date` | Date de début (optionnel, défaut : mois suivant) |
| `description` | Description du prélèvement |
| `contract_id` | ID du contrat |
| `company_id` | ID de la société |

### Résultat retourné

```json
{
  "success": true,
  "data": {
    "customer_id": "cst_xxx",
    "mandate_id": "mdt_xxx",
    "mandate_status": "valid",
    "subscription_id": "sub_xxx",
    "subscription_status": "active",
    "first_payment_date": "2026-03-01"
  }
}
```

## Modifications à effectuer

### 1. Edge Function `supabase/functions/mollie-sepa/index.ts`

Ajouter une nouvelle action `setup_sepa_complete` qui :
- Crée le client Mollie
- Crée le mandat SEPA directement avec l'IBAN
- Si le mandat est `valid`, crée immédiatement l'abonnement
- Met à jour le contrat avec `mollie_customer_id`, `mollie_mandate_id`, `mollie_mandate_status`, et `mollie_subscription_id`

Calcul automatique de la date de début : si non fournie, utiliser le 1er du mois suivant (pour laisser le temps au mandat d'être pleinement actif).

### 2. Utilitaire frontend `src/utils/mollie.ts`

Créer une nouvelle fonction `setupMollieSepaComplete()` qui :
- Appelle l'action `setup_sepa_complete`
- Retourne tous les IDs créés (customer, mandate, subscription)

### 3. Composant `MollieSepaCard.tsx`

Modifier `handleSubmit` pour :
- Appeler `setupMollieSepaComplete()` au lieu de `setupMollieSepaWithIban()`
- Afficher les informations de l'abonnement créé (ID, date de début, montant)
- Mettre à jour le message de succès pour confirmer les prélèvements récurrents

### 4. Interface de succès améliorée

Après création, afficher :
- ID du mandat + statut
- ID de l'abonnement + statut
- Montant mensuel × nombre de mois
- Date du premier prélèvement

## Exemple de flux complet

```text
Admin remplit le formulaire :
├── Prénom: Jean
├── Nom: Dupont
├── Email: jean@example.com
├── IBAN: BE68539007547034
├── Montant: 150.00€
├── Durée: 36 mois
└── [Clique sur "Créer le mandat SEPA"]

Edge Function exécute :
├── 1. Créer client → cst_abc123
├── 2. Créer mandat → mdt_xyz789 (status: valid)
├── 3. Créer abonnement → sub_def456 (150€/mois × 36)
└── 4. Update contrat avec tous les IDs

UI affiche :
├── ✅ Mandat SEPA créé (mdt_xyz789) - Valide
├── ✅ Abonnement actif (sub_def456)
├── 💶 150.00€ × 36 mois = 5 400.00€
└── 📅 Premier prélèvement : 1er mars 2026
```

## Gestion des erreurs

Si l'abonnement échoue après création du mandat :
- Le mandat reste valide
- L'erreur est loggée mais pas bloquante
- L'UI indique que le mandat est créé mais l'abonnement doit être créé manuellement

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/mollie-sepa/index.ts` | Ajouter action `setup_sepa_complete` |
| `src/utils/mollie.ts` | Ajouter fonction `setupMollieSepaComplete()` |
| `src/components/contracts/MollieSepaCard.tsx` | Utiliser la nouvelle fonction et afficher l'abonnement |

