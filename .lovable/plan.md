

# Plan : Correction des icônes tronquées sur le stepper

## Problème identifié

Les badges de numérotation et de validation (checkmark) sont positionnés avec `absolute -top-2` ce qui les fait dépasser du haut des cartes. Cependant, le conteneur parent a `overflow-x-auto` sans padding-top suffisant, ce qui tronque ces éléments visuellement.

**Ligne concernée (371):**
```tsx
<div className="relative flex items-start justify-center gap-0 overflow-x-auto pb-6">
```

---

## Solution

Ajouter un `pt-4` (padding-top) au conteneur du stepper pour laisser de l'espace aux badges qui dépassent en haut des cartes.

---

## Modification

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

**Ligne 371 - Ajouter `pt-4`:**

| Avant | Après |
|-------|-------|
| `overflow-x-auto pb-6` | `overflow-x-auto pt-4 pb-6` |

```tsx
// Avant
<div className="relative flex items-start justify-center gap-0 overflow-x-auto pb-6">

// Après
<div className="relative flex items-start justify-center gap-0 overflow-x-auto pt-4 pb-6">
```

---

## Résultat attendu

- Les badges numérotés (2, 3, 4...) en haut à droite des cartes seront entièrement visibles
- Le badge checkmark vert en haut à gauche des étapes terminées sera entièrement visible
- Pas de troncature visuelle sur le haut du stepper

