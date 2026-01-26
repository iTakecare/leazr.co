
# Plan : Correction de la progression du stepper de "Offre acceptée" vers "Résultat leaser"

## Problème identifié

### Analyse de la situation actuelle
- **Statut actuel de l'offre** : `accepted` (avec score leaser A)
- **Workflow utilisé** : "Demande Client Standard" avec les étapes :
  1. Brouillon (`draft`)
  2. Analyse Interne (`internal_review`) 
  3. Offre envoyée (`offer_send`)
  4. Offre acceptée (`offer_accepted`)
  5. Introduit leaser (`leaser_introduced`)
  6. Résultat leaser (`Scoring_review`) - **scoring_type: leaser**
  7. Contrat Prêt (`validated`)

### Cause du bug
Le `statusMapping` dans `getCurrentStepIndex` (ligne 132-155) ne contient pas le statut `accepted` :

```tsx
const statusMapping = {
  // ... autres mappings
  'offer_accepted': 'validated',  // ← Mapping incorrect !
  'leaser_accepted': 'validated',
  // 'accepted' n'existe pas ici !
};
```

**Conséquence** : 
- `accepted` n'étant pas mappé, le fallback partiel (ligne 161-165) peut retourner un index incorrect
- Le code pense être sur l'étape 4 "Offre acceptée" alors que le leaser a déjà validé avec un Score A
- Cliquer sur "Résultat leaser" (étape 6) ouvre la modale de scoring au lieu d'avancer

---

## Solution proposée

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

### 1. Ajouter `accepted` au statusMapping

Mapper `accepted` vers l'étape appropriée selon le contexte de progression du workflow :

| Statut DB | Étape cible | Raison |
|-----------|-------------|--------|
| `accepted` | `Scoring_review` | Le leaser a accepté (score A), on est à l'étape "Résultat leaser" |

**Modification ligne 132-155** :

```tsx
const statusMapping: { [key: string]: string } = {
  // ... mappings existants ...
  'accepted': 'Scoring_review',           // ← NOUVEAU : Offre acceptée par le leaser
  'offer_accepted': 'offer_accepted',     // ← CORRIGÉ : Ne plus mapper vers validated
  'score_leaser': 'Scoring_review',       // ← NOUVEAU : Alias pour étape scoring leaser
  'leaser_accepted': 'Scoring_review',    // ← CORRIGÉ : Mapper vers Scoring_review pas validated
  // ... autres mappings inchangés ...
};
```

### 2. Corriger la logique de mapping hiérarchique

Le problème est que `offer_accepted` est mappé vers `validated` alors que ce sont deux étapes distinctes dans le workflow. 

**Changements dans statusMapping** :

| Avant | Après |
|-------|-------|
| `'offer_accepted': 'validated'` | `'offer_accepted': 'offer_accepted'` |
| `'leaser_accepted': 'validated'` | `'leaser_accepted': 'Scoring_review'` |
| (absent) | `'accepted': 'Scoring_review'` |
| (absent) | `'score_leaser': 'Scoring_review'` |

### 3. Ajouter un mapping pour les étapes dynamiques

Pour gérer le cas où le step_key dans le workflow est différent (ex: `Scoring_review` vs `leaser_review`), ajouter une recherche par `scoring_type` plus robuste.

---

## Code final à modifier

### Lignes 132-155 - Nouveau statusMapping

```tsx
const statusMapping: { [key: string]: string } = {
  'internal_approved': 'internal_review',
  'internal_docs_requested': 'internal_review',
  'internal_rejected': 'internal_review',
  'internal_scoring': 'internal_review',
  'leaser_approved': 'Scoring_review',       // Corrigé
  'leaser_docs_requested': 'Scoring_review', // Corrigé  
  'leaser_rejected': 'Scoring_review',       // Corrigé
  'leaser_scoring': 'Scoring_review',        // Corrigé
  'leaser_sent': 'leaser_introduced',        // Corrigé
  'leaser_accepted': 'Scoring_review',       // Corrigé
  'Scoring_review': 'Scoring_review',
  'score_leaser': 'Scoring_review',          // Nouveau
  'accepted': 'Scoring_review',              // Nouveau
  'offer_send': 'offer_send',                // Corrigé pour être explicite
  'offer_sent': 'offer_send',
  'client_approved': 'client_approved',
  'offer_accepted': 'offer_accepted',        // Corrigé
  'offer_validation': 'validated',
  'validated': 'validated',
  'financed': 'validated',
  'invoicing': 'invoicing',
  'draft': 'draft',
  'sent': 'offer_send',
  'leaser_introduced': 'leaser_introduced'
};
```

---

## Récapitulatif des changements

| Modification | Description |
|--------------|-------------|
| Ajouter `'accepted': 'Scoring_review'` | Mapper le statut "accepted" vers l'étape scoring leaser |
| Corriger `'offer_accepted': 'offer_accepted'` | Ne plus sauter vers validated |
| Corriger `'leaser_accepted': 'Scoring_review'` | Mapper vers étape résultat leaser |
| Ajouter `'score_leaser': 'Scoring_review'` | Alias supplémentaire |
| Corriger `'leaser_*': 'Scoring_review'` | Tous les statuts leaser sauf introduced |
| Corriger `'leaser_sent': 'leaser_introduced'` | Mapper vers l'étape d'introduction |

---

## Résultat attendu

- Quand le statut est `accepted` (score leaser A), l'étape active sera "Résultat leaser" (étape 6)
- Le bouton "Vers Contrat Prêt" apparaîtra pour avancer à l'étape 7
- Les étapes 1-5 seront marquées comme terminées
- La progression vers "Contrat Prêt" fonctionnera correctement

---

## Fichier impacté

| Fichier | Modifications |
|---------|---------------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Mise à jour du statusMapping (lignes 132-155) |
