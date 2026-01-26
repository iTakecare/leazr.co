

# Plan : Application exacte du design WinBroker au stepper Leazr

## Objectif

Modifier le composant `WinBrokerWorkflowStepper.tsx` pour qu'il soit **identique** au design WinBroker de la première capture.

---

## Analyse détaillée des différences

### WinBroker (Design cible - 1ère capture)

| Élément | Style WinBroker |
|---------|-----------------|
| Icône | Dans une **boîte grise arrondie** (`bg-gray-100 rounded-lg p-3`) |
| Carte active | Bordure **orange vif** épaisse (`border-orange-400`) |
| Badge numéro (active) | **Orange** en haut à droite |
| Checkmark (complétée) | **Vert** en haut à gauche |
| Badge "Terminée" | Vert avec fond vert clair |
| Badge "À venir" | **Texte gris** (pas vert) |
| Connecteurs | Pointillés gris (`---→`) |
| Score/En attente | Affiché **sous l'icône** dans la carte |
| Popup action | Attachée à la carte, boutons empilés |

### Leazr (Problèmes actuels - 2ème capture)

| Problème | Correction nécessaire |
|----------|----------------------|
| Icône sans background box | Ajouter `bg-gray-50 rounded-lg p-3` autour de l'icône |
| Bordure active bleue/primary | Changer pour **orange** (`border-orange-400`) |
| Badge numéro bleu | Changer pour **orange** pour l'étape active |
| Badge "À venir" vert | Changer pour **gris** (`text-gray-400 bg-gray-100`) |
| Score dans la carte | Séparer visuellement avec badge sous l'icône |
| Connecteur tiret solide | Utiliser **pointillés** (`border-dashed`) |

---

## Modifications à apporter

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

#### 1. Icône dans une boîte grise arrondie

```tsx
{/* Icon box - WinBroker style */}
<div className={cn(
  "p-3 rounded-lg",
  isCompleted && "bg-primary/10",
  isActive && "bg-orange-50",
  isUpcoming && "bg-gray-100"
)}>
  <Icon className={cn(
    "w-8 h-8",
    isCompleted && "text-primary",
    isActive && "text-orange-500",
    isUpcoming && "text-gray-400"
  )} />
</div>
```

#### 2. Couleurs de bordure et badge pour étape active = ORANGE

```tsx
{/* Card styles */}
className={cn(
  "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all min-w-[120px] min-h-[100px]",
  isCompleted && "border-primary/40 bg-white",
  isActive && "border-orange-400 shadow-lg bg-white",  // ORANGE pour active
  isUpcoming && "border-gray-200 bg-white"
)}

{/* Number badge for active step - ORANGE */}
{isActive && (
  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-orange-500 text-white">
    {step.number}
  </div>
)}
```

#### 3. Badge "À venir" en GRIS (pas vert)

```tsx
<Badge 
  variant="secondary"
  className={cn(
    "mt-2 text-xs font-medium",
    isCompleted && "bg-green-100 text-green-600",
    isActive && "bg-orange-100 text-orange-600",  // Orange pour active
    isUpcoming && "bg-gray-100 text-gray-500"     // GRIS pour à venir
  )}
>
  {isCompleted ? 'Terminée' : isActive ? 'En cours' : 'À venir'}
</Badge>
```

#### 4. Connecteurs en pointillés

```tsx
{/* Dashed arrow connector - WinBroker style */}
{index < activeSteps.length - 1 && (
  <div className="flex items-center self-start mt-12 px-2">
    <div className="w-8 border-t-2 border-dashed border-gray-300"></div>
    <ChevronRight className="w-4 h-4 text-gray-300 -ml-1" />
  </div>
)}
```

#### 5. Score affiché proprement sous l'icône

```tsx
{/* Score badge inside icon box */}
{score && (
  <div className="mt-2 flex flex-col items-center">
    <span className="text-xs text-gray-500">Score {score}</span>
  </div>
)}

{/* Waiting docs badge */}
{waitingDocs && (
  <span className="text-xs text-gray-500 mt-1">En attente</span>
)}
```

#### 6. Lien "Retour à" avec flèche courbe (↩)

```tsx
{/* Return link for completed steps */}
{isCompleted && (
  <button className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
    <span>↩</span>
    Retour à {step.label}
  </button>
)}
```

---

## Palette de couleurs finale

| État | Bordure | Badge numéro | Badge statut | Icône background | Connecteur |
|------|---------|--------------|--------------|------------------|------------|
| **Complétée** | `border-primary/40` | Check vert (gauche) | `bg-green-100 text-green-600` | `bg-primary/10` | - |
| **Active** | `border-orange-400` | Orange (droite) | `bg-orange-100 text-orange-600` | `bg-orange-50` | - |
| **À venir** | `border-gray-200` | Gris (droite) | `bg-gray-100 text-gray-500` | `bg-gray-100` | `border-dashed border-gray-300` |

---

## Structure visuelle finale

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ ↯ Progression du workflow  • Workflow Winfinance                               │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────┐            ┌──────────┐            ┌──────────┐                  │
│  │✓         │   ----→    │   ▢     2│   ----→    │        3 │                  │
│  │  ┌────┐  │            │  ┌────┐  │            │  ┌────┐  │                  │
│  │  │ 📄 │  │            │  │ 📋 │  │            │  │ 🔍 │  │                  │
│  │  └────┘  │            │  └────┘  │            │  └────┘  │                  │
│  │          │            │ Score B  │            │          │                  │
│  └──────────┘            └══════════┘            └──────────┘                  │
│                           (orange)                                             │
│  Nouvelle                Collecte                Étude du                      │
│  demande                 documents               dossier                       │
│                                                                                │
│ ┌──────────┐            ┌──────────┐            ┌──────────┐                   │
│ │ Terminée │            │ En cours │            │ À venir  │                   │
│ │  (vert)  │            │ (orange) │            │  (gris)  │                   │
│ └──────────┘            └──────────┘            └──────────┘                   │
│                                                                                │
│ ↩ Retour à              ┌─────────────────┐                                    │
│   Nouvelle              │ 📋 Analyse      │                                    │
│                         │    Interne      │                                    │
│                         ├─────────────────┤                                    │
│                         │ Vers Étude →    │                                    │
│                         └─────────────────┘                                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Résumé des changements clés

1. **Icônes dans des boîtes grises arrondies** - pas directement dans la carte
2. **Bordure orange pour l'étape active** - pas bleue/primary
3. **Badge numéro orange** pour l'étape active
4. **Badge "À venir" en gris** - pas en vert
5. **Connecteurs en pointillés** avec flèches
6. **Score affiché proprement** sous l'icône dans la carte
7. **Symbole ↩** pour "Retour à" au lieu de flèche

---

## Fichier à modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Refonte complète du rendu visuel pour correspondre exactement à WinBroker |

