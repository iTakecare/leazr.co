
# Plan : Gestion Complète des Dossiers "Sans Suite"

## Résumé

Implémentation d'un système complet pour gérer les dossiers sans réponse client, intégrant :
- **Bouton "Classer sans suite"** séparé du scoring avec sous-raisons
- **Score D** distinct du Score C dans le système de notation
- **Compteur de relances** visible avec historique
- **Onglet "Sans suite"** dédié dans la liste des demandes
- **Possibilité de réactiver** un dossier classé sans suite

---

## 1. Nouveau Statut Workflow : `without_follow_up`

### Ajout dans `OfferStatusBadge.tsx`

```typescript
WITHOUT_FOLLOW_UP: { 
  id: "without_follow_up", 
  label: "Sans suite", 
  icon: UserX,  // Nouvelle icône
  color: "bg-gray-100 text-gray-600 border-gray-300"
}
```

### Sous-raisons disponibles

| Code | Label |
|------|-------|
| `no_response` | Plus de nouvelles après relances |
| `project_postponed` | Projet reporté par le client |
| `went_competitor` | Parti chez un concurrent |
| `budget_issue` | Problème de budget |
| `project_cancelled` | Projet annulé |
| `other` | Autre raison |

---

## 2. Score D : "Sans Suite"

### Modification du système de scoring

Actuellement : A (Approuvé) / B (Documents) / C (Refusé)

Nouveau : A / B / C / **D (Sans suite)**

| Score | Signification | Couleur |
|-------|---------------|---------|
| A | Approuvé - Dossier complet | Vert |
| B | Documents requis | Ambre |
| C | **Refusé - Dossier non conforme** | Rouge |
| D | **Sans suite - Pas de réponse** | Gris |

### Avantage
- Score C = Refus qualifié (fraude, entreprise trop jeune, etc.)
- Score D = Inactivité (pas de réponse, projet reporté, etc.)
- Les statistiques de conversion seront plus précises

---

## 3. Architecture des Composants

```text
src/components/offers/detail/
├── ScoringModal.tsx              # MODIFIER - Ajouter Score D
├── NoFollowUpModal.tsx           # CRÉER - Modal "Classer sans suite"
├── ReactivateOfferButton.tsx     # CRÉER - Bouton de réactivation
└── ReminderCountBadge.tsx        # CRÉER - Compteur de relances

src/components/offers/
├── OffersFilter.tsx              # MODIFIER - Ajouter onglet "Sans suite"
└── OfferStatusBadge.tsx          # MODIFIER - Ajouter statut WITHOUT_FOLLOW_UP

src/hooks/offers/
└── useOfferFilters.ts            # MODIFIER - Ajouter filtre "without_follow_up"
```

---

## 4. Modal "Classer Sans Suite"

### Interface utilisateur

```text
+----------------------------------------------------------+
|  Classer ce dossier sans suite                      [X]  |
+----------------------------------------------------------+
|                                                          |
|  📊 Historique des relances                              |
|  ┌────────────────────────────────────────────────────┐  |
|  │ • Relance L1 - 15/01/2026 (email)                 │  |
|  │ • Relance L2 - 22/01/2026 (email)                 │  |
|  │ • Relance L3 - 29/01/2026 (email) ← Dernière      │  |
|  └────────────────────────────────────────────────────┘  |
|                                                          |
|  Raison du classement sans suite :                       |
|  ○ Plus de nouvelles après relances                      |
|  ○ Projet reporté par le client                          |
|  ○ Parti chez un concurrent                              |
|  ○ Problème de budget                                    |
|  ○ Projet annulé                                         |
|  ○ Autre raison                                          |
|                                                          |
|  [Zone de texte pour commentaire optionnel]              |
|                                                          |
|  +------------------------------------------------------+|
|  | [Annuler]                    [Classer sans suite] 📁 ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### Fonctionnalités
- Affiche l'historique des relances envoyées (depuis `offer_reminders`)
- Permet de sélectionner une raison parmi les sous-raisons prédéfinies
- Commentaire optionnel
- Met à jour `workflow_status` → `without_follow_up`
- Enregistre la raison dans `offer_workflow_logs`
- Attribue automatiquement le **Score D** (interne ou leaser selon l'étape)

---

## 5. Compteur de Relances

### Badge `ReminderCountBadge.tsx`

Affiche le nombre de relances envoyées sur un dossier :

```tsx
<ReminderCountBadge offerId={offer.id} />
// Rendu: [📧 3 relances] ou [📧 0] si aucune
```

### Données source
- Table `offer_reminders` existante
- Compte les entrées avec `sent_at IS NOT NULL`
- Groupé par `offer_id`

### Affichage
- Dans la liste des offres (colonne ou badge)
- Dans la fiche détail de l'offre
- Dans le modal "Classer sans suite"

---

## 6. Onglet "Sans Suite" dans les Filtres

### Modification `OffersFilter.tsx`

```tsx
<TabsList>
  <TabsTrigger value="in_progress">À traiter</TabsTrigger>
  <TabsTrigger value="accepted">Acceptées</TabsTrigger>
  <TabsTrigger value="invoiced">Facturé</TabsTrigger>
  <TabsTrigger value="without_follow_up">Sans suite</TabsTrigger>  {/* NOUVEAU */}
  <TabsTrigger value="rejected">Refusées</TabsTrigger>
</TabsList>
```

### Modification `useOfferFilters.ts`

```typescript
const withoutFollowUpStatuses = new Set(['without_follow_up']);

// Dans le filtre
if (activeTab === "without_follow_up") {
  return withoutFollowUpStatuses.has(status);
}
```

### Distinction visuelle
- **Sans suite** : Badge gris, icône `UserX`
- **Refusées** : Badge rouge, icône `XCircle`

---

## 7. Bouton de Réactivation

### Composant `ReactivateOfferButton.tsx`

Visible uniquement sur les dossiers avec statut `without_follow_up` :

```tsx
<Button variant="outline" onClick={handleReactivate}>
  <RefreshCcw className="w-4 h-4 mr-2" />
  Réactiver le dossier
</Button>
```

### Comportement
1. Ouvre un modal de confirmation
2. Demande vers quel statut revenir :
   - `draft` (Brouillon)
   - `sent` (Offre envoyée)
   - `internal_review` (Analyse interne)
3. Réinitialise le score D
4. Enregistre l'action dans `offer_workflow_logs`

---

## 8. Modification de la Base de Données

### Nouvelles colonnes sur `offers`

Aucune modification nécessaire - le statut `without_follow_up` est déjà supporté dans `workflow_status`.

### Modification table `offer_workflow_logs`

Ajouter un champ optionnel pour stocker la sous-raison :

```sql
ALTER TABLE offer_workflow_logs 
ADD COLUMN sub_reason TEXT;
```

### Données stockées lors du classement sans suite

```json
{
  "previous_status": "sent",
  "new_status": "without_follow_up",
  "reason": "Plus de nouvelles après relances",
  "sub_reason": "no_response",
  "score_assigned": "D"
}
```

---

## 9. Modification du ScoringModal

### Ajout du Score D

```typescript
const scoreOptions = [
  { score: 'A', label: 'Approuvé', ... },
  { score: 'B', label: 'Documents requis', ... },
  { score: 'C', label: 'Refusé', description: 'Dossier non conforme - Refus qualifié', ... },
  { 
    score: 'D', 
    label: 'Sans suite', 
    description: 'Client injoignable ou projet abandonné',
    icon: UserX,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    nextStep: 'Classement sans suite'
  }
];
```

### Comportement Score D
- Sélection d'une sous-raison (comme pour Score C)
- Transition vers `without_follow_up`
- Pas d'envoi d'email (contrairement à Score C)
- Possibilité de réactivation ultérieure

---

## 10. Intégration dans le Workflow Stepper

### Affichage du statut "Sans suite"

Le stepper affichera un indicateur spécial pour les dossiers classés sans suite :

```text
[Brouillon] → [Envoyée] → [Analyse] → ❌ [Sans suite]
                                         ↓
                                    [Réactiver ?]
```

### Badge Score D

```tsx
const getScoreBadgeColor = (score: 'A' | 'B' | 'C' | 'D') => {
  switch (score) {
    case 'A': return 'bg-green-100 text-green-800';
    case 'B': return 'bg-amber-100 text-amber-800';
    case 'C': return 'bg-red-100 text-red-800';
    case 'D': return 'bg-gray-100 text-gray-800';  // NOUVEAU
  }
};
```

---

## 11. Fichiers à Créer/Modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/NoFollowUpModal.tsx` | CRÉER |
| `src/components/offers/detail/ReactivateOfferButton.tsx` | CRÉER |
| `src/components/offers/ReminderCountBadge.tsx` | CRÉER |
| `src/components/offers/detail/ScoringModal.tsx` | MODIFIER - Ajouter Score D |
| `src/components/offers/OffersFilter.tsx` | MODIFIER - Ajouter onglet |
| `src/components/offers/OfferStatusBadge.tsx` | MODIFIER - Ajouter statut |
| `src/hooks/offers/useOfferFilters.ts` | MODIFIER - Ajouter filtre |
| `src/components/offers/detail/InteractiveWorkflowStepper.tsx` | MODIFIER - Score D |
| `src/services/offers/offerStatus.ts` | MODIFIER - Gestion Score D |

---

## 12. Migration Base de Données

```sql
-- Ajouter la colonne sub_reason aux logs
ALTER TABLE public.offer_workflow_logs 
ADD COLUMN IF NOT EXISTS sub_reason TEXT;

-- Ajouter un commentaire descriptif
COMMENT ON COLUMN public.offer_workflow_logs.sub_reason IS 
  'Sous-raison pour les statuts without_follow_up (no_response, project_postponed, etc.)';
```

---

## 13. Ordre d'Implémentation

1. **Migration DB** : Ajouter `sub_reason` à `offer_workflow_logs`
2. **OfferStatusBadge** : Ajouter le statut `without_follow_up`
3. **useOfferFilters** : Ajouter le filtre pour l'onglet "Sans suite"
4. **OffersFilter** : Ajouter l'onglet "Sans suite"
5. **ScoringModal** : Ajouter Score D avec comportement spécifique
6. **NoFollowUpModal** : Créer le modal de classement
7. **ReminderCountBadge** : Créer le compteur de relances
8. **ReactivateOfferButton** : Créer le bouton de réactivation
9. **offerStatus.ts** : Gérer la transition et le Score D
10. **WorkflowStepper** : Intégrer l'affichage Score D

---

## 14. Flux Utilisateur Final

```text
                        ┌─────────────────────┐
                        │   Dossier en cours  │
                        └──────────┬──────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │   Score A    │       │   Score B    │       │   Score C    │
    │   Approuvé   │       │   Documents  │       │   Refusé     │
    └──────────────┘       └──────────────┘       └──────────────┘
                                   │                       │
                                   │                       │
           ┌───────────────────────┴───────────┐           │
           │                                   │           │
           ▼                                   ▼           │
    ┌──────────────┐                   ┌──────────────┐    │
    │  Relance L1  │                   │   Score D    │◄───┘
    │  Relance L2  │──────────────────▶│  Sans suite  │
    │  Relance L3  │                   └──────┬───────┘
    └──────────────┘                          │
                                              │
                                              ▼
                                   ┌──────────────────┐
                                   │   Réactiver ?    │
                                   │  ○ Brouillon     │
                                   │  ○ Envoyée       │
                                   │  ○ Analyse       │
                                   └──────────────────┘
```

---

## 15. Impact sur les Statistiques

### Dashboard Commercial
- Les dossiers "Sans suite" (Score D) seront comptés séparément des "Refusés" (Score C)
- Nouveau KPI : "Taux d'abandon" (Sans suite / Total)
- Les conversions ne seront plus faussées par les clients injoignables

### Dashboard Financier
- Les montants des dossiers "Sans suite" seront affichés dans une catégorie à part
- Distinction entre pertes réelles (Score C) et opportunités non concrétisées (Score D)
