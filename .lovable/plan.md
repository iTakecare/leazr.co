

# Plan : Design exact du stepper WinBroker avec couleurs

## Objectif

Modifier le composant `WinBrokerWorkflowStepper.tsx` pour reproduire **exactement** le design de WinBroker avec :
- Des cartes plus grandes et colorées
- Le placement des badges conforme au design
- Les bonnes couleurs pour chaque état

---

## Analyse détaillée du design WinBroker

### Étape complétée (ex: "Nouvelle demande")
- **Checkmark** : coin **supérieur gauche** (pas droite)
- **Bordure** : violette subtile (`border-primary/40`)
- **Icône** : couleur primaire
- **Badge "Terminée"** : fond vert clair, texte vert (`bg-green-100 text-green-600`)
- **Lien** : "Retour à [étape]" en violet sous la carte

### Étape active (ex: "Collecte documents")
- **Numéro** : coin supérieur droit, badge violet plein (`bg-primary`)
- **Bordure** : violette épaisse avec ombre (`border-primary shadow-lg`)
- **Icône** : couleur primaire, grande (w-8 h-8)
- **Badge "En cours"** : fond bleu, texte blanc (`bg-primary`)
- **Score** : si présent, affiché dans la carte
- **Actions** : popup attachée avec :
  - "📋 Demander documents" ou "Analyse Interne"
  - "Vers [prochaine étape] →" en bouton

### Étapes à venir
- **Numéro** : coin supérieur droit, gris clair (`bg-gray-100`)
- **Bordure** : grise légère
- **Icône** : grise
- **Badge "À venir"** : fond vert très clair (`bg-green-50 text-green-600`)

---

## Modifications à apporter

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

#### 1. Cartes plus grandes avec padding augmenté

```tsx
// Avant
className="... p-4 ... min-w-[100px] min-h-[80px]"

// Après
className="... p-6 ... min-w-[120px] min-h-[100px]"
```

#### 2. Position du badge : checkmark à gauche pour complétées

```tsx
{/* Badge position - checkmark gauche pour complétées, numéro droite pour actif/à venir */}
{isCompleted ? (
  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-primary text-primary-foreground">
    <Check className="w-3 h-3" />
  </div>
) : (
  <div className={cn(
    "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
    isActive && "bg-primary text-primary-foreground",
    isUpcoming && "bg-gray-100 text-gray-500 border border-gray-200"
  )}>
    {step.number}
  </div>
)}
```

#### 3. Couleurs des badges de statut style WinBroker

```tsx
{/* Status badge - WinBroker colors */}
<Badge 
  variant="secondary"
  className={cn(
    "mt-2 text-xs font-medium",
    isCompleted && "bg-green-100 text-green-600 border-green-200",
    isActive && "bg-primary text-primary-foreground",
    isUpcoming && "bg-green-50 text-green-600 border-green-100"
  )}
>
  {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
</Badge>
```

#### 4. Bordures colorées des cartes

```tsx
className={cn(
  "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 bg-card transition-all min-w-[120px] min-h-[100px]",
  isCompleted && "border-primary/40 bg-primary/5",
  isActive && "border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5",
  isUpcoming && "border-gray-200 bg-white",
  canClick && !updating && "cursor-pointer hover:shadow-md hover:border-primary/50",
  (!canClick || updating) && "cursor-not-allowed opacity-70"
)}
```

#### 5. Lien "Retour à" sous les étapes complétées

Ajouter un lien cliquable sous les cartes complétées :

```tsx
{/* Return link for completed steps - WinBroker style */}
{isCompleted && (
  <button 
    onClick={(e) => {
      e.stopPropagation();
      handleStepClick(step.key, index);
    }}
    className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
    disabled={updating}
  >
    <ArrowLeft className="w-3 h-3" />
    Retour à {step.label}
  </button>
)}
```

#### 6. Popup d'actions redesignée

La popup pour l'étape active doit avoir :
- Bordure et ombre plus prononcées
- Séparateurs visibles
- Le bouton "Vers [étape]" bien visible

```tsx
{/* Action popup for active step - exact WinBroker style */}
{isActive && (
  <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-100 rounded-xl shadow-2xl min-w-[220px] z-20 overflow-hidden">
    {/* Analysis/Document request button */}
    {step.enables_scoring && onAnalysisClick && step.scoring_type && (
      <button 
        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-gray-50 border-b border-gray-100 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onAnalysisClick(step.scoring_type as 'internal' | 'leaser');
        }}
      >
        <ClipboardList className="w-5 h-5 text-gray-500" />
        <span className="font-medium">
          {step.scoring_type === 'internal' ? 'Analyse Interne' : 'Demander documents'}
        </span>
      </button>
    )}

    {/* Next step button - prominent */}
    {nextStep && (
      <button 
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleStepClick(nextStep.key, currentIndex + 1);
        }}
        disabled={updating}
      >
        <span>Vers {nextStep.label}</span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </button>
    )}
  </div>
)}
```

---

## Structure finale de chaque étape

```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  COMPLÉTÉE           ACTIVE              À VENIR           │
│  ┌──────────┐       ┌══════════┐       ┌──────────┐       │
│  │✓         │       │        [2]│       │        [3]│       │
│  │   📄     │       │   📋     │       │   🔍     │       │
│  │          │       │  ────    │       │          │       │
│  └──────────┘       └══════════┘       └──────────┘       │
│  Nouvelle           Collecte           Étude du           │
│  demande            documents          dossier            │
│ ┌──────────┐       ┌──────────┐       ┌──────────┐       │
│ │ Terminée │       │ En cours │       │ À venir  │       │
│ │  (vert)  │       │  (bleu)  │       │ (vert)   │       │
│ └──────────┘       └──────────┘       └──────────┘       │
│ ↩ Retour à         ┌─────────────┐                        │
│   Nouvelle         │ 📋 Demander │                        │
│                    │   documents │                        │
│                    │─────────────│                        │
│                    │Vers Étude → │                        │
│                    └─────────────┘                        │
└────────────────────────────────────────────────────────────┘
```

---

## Palette de couleurs WinBroker

| État | Bordure carte | Badge numéro | Badge statut | Icône |
|------|---------------|--------------|--------------|-------|
| Complétée | `border-primary/40` | Check vert à gauche | `bg-green-100 text-green-600` | `text-primary` |
| Active | `border-primary shadow-lg` | Numéro blanc sur violet | `bg-primary text-white` | `text-primary` |
| À venir | `border-gray-200` | Numéro gris | `bg-green-50 text-green-600` | `text-gray-400` |

---

## Fichier à modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Mise à jour complète du rendu visuel |

---

## Résultat attendu

Après ces modifications :
- ✅ Cartes plus grandes (120x100px min avec padding 6)
- ✅ Checkmark positionné à **gauche** pour les étapes complétées
- ✅ Numéros à **droite** pour les étapes actives/à venir
- ✅ Badge "Terminée" en **vert**
- ✅ Badge "En cours" en **bleu/primary**
- ✅ Badge "À venir" en **vert clair**
- ✅ Lien "Retour à [étape]" sous les cartes complétées
- ✅ Popup d'action avec design WinBroker exact
- ✅ Bordures colorées selon l'état
- ✅ Design professionnel et moderne

