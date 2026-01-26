

# Plan : Centrer le stepper et intégrer les boutons dans les cartes

## Objectif

Modifier le composant `WinBrokerWorkflowStepper.tsx` pour :
1. **Centrer le stepper** horizontalement sur la page
2. **Placer les boutons d'action à l'intérieur de la carte** de l'étape active (comme WinBroker)

---

## Analyse du problème actuel

### Problème 1 : Stepper non centré

**Code actuel (ligne 371):**
```tsx
<div className="relative flex items-start justify-start gap-0 overflow-x-auto pb-24">
```

**Solution:** Changer `justify-start` en `justify-center`

---

### Problème 2 : Boutons en popup externe

**Situation actuelle:**
- Les boutons d'action sont dans un `div` positionné en `absolute` **en dessous** de la carte
- Ils apparaissent comme un menu flottant séparé

**Design WinBroker cible:**
- Les boutons sont **directement dans la carte**, sous l'icône
- Ils font partie intégrante de la carte, pas un popup séparé

---

## Modifications à apporter

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

#### 1. Centrer le stepper

```tsx
// Ligne 371 - Changer justify-start en justify-center
<div className="relative flex items-start justify-center gap-0 overflow-x-auto pb-6">
```

Réduire aussi `pb-24` à `pb-6` car les boutons ne seront plus en dessous.

---

#### 2. Déplacer les boutons à l'intérieur de la carte

Supprimer le popup externe (lignes 490-534) et intégrer les boutons directement dans le `<button>` de la carte :

```tsx
<button className={cn(
  "relative flex flex-col items-center justify-start p-4 rounded-xl border-2 transition-all min-w-[160px] min-h-[180px]",
  // ... styles existants
)}>
  {/* Badge numéro/check - existant */}
  
  {/* Icon box - existant */}
  
  {/* Score/En attente - existant */}
  
  {/* NOUVEAUX: Boutons d'action DANS la carte pour l'étape active */}
  {isActive && (
    <div className="mt-3 flex flex-col gap-2 w-full px-2">
      {/* Bouton Analyse/Documents */}
      {step.enables_scoring && onAnalysisClick && step.scoring_type && (
        <button 
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAnalysisClick(step.scoring_type as 'internal' | 'leaser');
          }}
        >
          <ClipboardList className="w-4 h-4 text-gray-500" />
          <span>
            {step.scoring_type === 'internal' ? 'Analyse Interne' : 'Analyse Leaser'}
          </span>
        </button>
      )}

      {/* Bouton Vers prochaine étape */}
      {nextStep && (
        <button 
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleStepClick(nextStep.key, currentIndex + 1);
          }}
          disabled={updating}
        >
          <span>Vers {nextStep.label}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )}
</button>
```

---

#### 3. Ajuster la taille des cartes

Pour que les boutons tiennent dans les cartes :
- Augmenter `min-h` de `120px` à `180px` pour les cartes actives
- Utiliser `justify-start` au lieu de `justify-center` dans le conteneur de carte

```tsx
className={cn(
  "relative flex flex-col items-center justify-start p-4 rounded-xl border-2 transition-all min-w-[160px]",
  isActive ? "min-h-[200px]" : "min-h-[140px]",
  // ... reste des styles
)}
```

---

## Structure visuelle finale

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ↯ Progression du workflow  • Workflow Winfinance                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│            ┌──────────┐       ┌════════════════┐       ┌──────────┐            │
│            │✓         │       │             [2]│       │        [3]│            │
│            │  ┌────┐  │       │    ┌────┐     │       │  ┌────┐  │            │
│            │  │ 📄 │  │  ---→ │    │ 📋 │     │  ---→ │  │ 🔍 │  │            │
│            │  └────┘  │       │    └────┘     │       │  └────┘  │            │
│            │          │       │    Score B    │       │          │            │
│            │          │       │ ┌───────────┐ │       │          │            │
│            │          │       │ │📋 Analyse │ │       │          │            │
│            │          │       │ │  Interne  │ │       │          │            │
│            │          │       │ ├───────────┤ │       │          │            │
│            │          │       │ │Vers Étude→│ │       │          │            │
│            └──────────┘       └════════════════┘       └──────────┘            │
│            Nouvelle           Collecte                Étude du                 │
│            demande            documents               dossier                  │
│            ┌──────────┐       ┌──────────┐           ┌──────────┐             │
│            │ Terminée │       │ En cours │           │ À venir  │             │
│            └──────────┘       └──────────┘           └──────────┘             │
│            ↩ Retour à                                                          │
│               Nouvelle                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Récapitulatif des changements

| Élément | Avant | Après |
|---------|-------|-------|
| Alignement stepper | `justify-start` | `justify-center` |
| Position boutons | Popup `absolute` en dessous | Intégrés dans la carte |
| Taille carte active | `min-h-[120px]` | `min-h-[200px]` |
| Padding bottom container | `pb-24` | `pb-6` |
| Alignement carte | `justify-center` | `justify-start` |

---

## Fichier à modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Centrer le stepper + boutons dans la carte |

