

# Plan : Refonte du stepper de workflow style WinBroker

## Objectif

Refondre le composant `WinBrokerWorkflowStepper` pour qu'il corresponde exactement au design WinBroker de la deuxieme capture, avec des icones plus visibles et un design professionnel.

---

## Analyse du design cible (WinBroker - 2e capture)

### Elements visuels cles

1. **Boites d'etapes** : 
   - Fond blanc avec bordure grise legere
   - Bordure bleue epaisse pour l'etape active
   - Coins arrondis (rounded-xl)
   - Taille plus grande (~100px x 80px)

2. **Numeros d'etapes** :
   - Petit badge circulaire dans le coin superieur droit de la boite
   - Fond gris clair pour les etapes a venir
   - Check vert pour les etapes completees

3. **Icones** :
   - Grande taille (w-8 h-8)
   - Centrees dans la boite
   - Couleur grise pour les etapes a venir
   - Couleur bleue pour l'etape active

4. **Labels** :
   - Nom de l'etape sous la boite
   - Badge "En cours" / "Terminee" / "A venir" en dessous

5. **Connecteurs** :
   - Fleches legeres entre les boites (`—→`)
   - Style discret

6. **Popup d'action** (etape active) :
   - Attachee en bas de la boite active
   - Contient les boutons d'action
   - "Demander documents" avec icone
   - "Retour a [etape precedente]" en lien orange/rouge
   - "Vers [prochaine etape] →" en bouton bleu

---

## Structure du nouveau composant

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Progression du workflow  •  Workflow Winfinance                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│  │    ✓    ●│  —→  │    [2]  ●│  —→  │    [3]  ●│  —→  │    [4]  ●│            │
│  │    📄    │      │    📋    │      │    📬    │      │    ✍️    │            │
│  │          │      │   ====   │      │          │      │          │            │
│  └──────────┘      └══════════┘      └──────────┘      └──────────┘            │
│   Nouvelle         Collecte          Etude du         Proposition              │
│   demande          documents         dossier          client                   │
│   Terminee         En cours          A venir          A venir                  │
│                    ┌─────────────┐                                             │
│                    │ 📄 Demander │                                             │
│                    │   documents │                                             │
│                    │─────────────│                                             │
│                    │↩ Retour a   │                                             │
│                    │   Nouvelle  │                                             │
│                    │─────────────│                                             │
│                    │Vers Etude→  │                                             │
│                    └─────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Modifications du code

### Fichier : `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

#### 1. Structure de chaque etape

Remplacer la structure actuelle par des boites plus grandes avec badge de numero :

```tsx
{/* Step box */}
<div className={cn(
  "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-white transition-all min-w-[100px] min-h-[80px]",
  isCompleted && "border-primary/30",
  isActive && "border-primary shadow-md",
  isUpcoming && "border-gray-200",
  canClick && !updating && "cursor-pointer hover:shadow-sm"
)}>
  {/* Number badge in corner */}
  <div className={cn(
    "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
    isCompleted && "bg-primary text-white",
    isActive && "bg-primary text-white",
    isUpcoming && "bg-gray-100 text-gray-500"
  )}>
    {isCompleted ? <Check className="w-3 h-3" /> : step.number}
  </div>

  {/* Large icon */}
  <Icon className={cn(
    "w-8 h-8",
    isCompleted && "text-primary",
    isActive && "text-primary",
    isUpcoming && "text-gray-400"
  )} />
</div>
```

#### 2. Connecteurs entre etapes

Remplacer les connecteurs pointilles par des fleches simples :

```tsx
{/* Arrow connector */}
{index < activeSteps.length - 1 && (
  <div className="flex items-center px-2 text-gray-300">
    <span className="text-lg">—</span>
    <ChevronRight className="w-4 h-4 -ml-1" />
  </div>
)}
```

#### 3. Labels et badges de statut

```tsx
{/* Step label */}
<span className="mt-3 text-sm font-medium text-center text-foreground">
  {step.label}
</span>

{/* Status badge */}
<Badge 
  variant={isActive ? "default" : "secondary"}
  className={cn(
    "mt-1",
    isCompleted && "bg-primary/10 text-primary",
    isActive && "bg-primary text-white",
    isUpcoming && "bg-gray-100 text-gray-500"
  )}
>
  {isCompleted ? 'Terminee' : isActive ? 'En cours' : 'A venir'}
</Badge>
```

#### 4. Popup d'action amelioree

```tsx
{/* Action popup for active step */}
{isActive && (
  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-20 overflow-hidden">
    {/* Document request button */}
    {step.enables_scoring && (
      <button 
        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100"
        onClick={() => onAnalysisClick?.(step.scoring_type)}
      >
        <FileText className="w-4 h-4 text-gray-500" />
        Demander documents
      </button>
    )}

    {/* Back to previous step */}
    {currentIndex > 0 && (
      <button 
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 border-b border-gray-100"
        onClick={() => handleStepClick(activeSteps[currentIndex - 1].key, currentIndex - 1)}
      >
        <ArrowLeft className="w-4 h-4" />
        Retour a {activeSteps[currentIndex - 1].label}
      </button>
    )}

    {/* Next step button */}
    {nextStep && (
      <button 
        className="w-full flex items-center justify-between px-4 py-3 text-sm bg-primary text-white hover:bg-primary/90"
        onClick={() => handleStepClick(nextStep.key, currentIndex + 1)}
      >
        <span>Vers {nextStep.label}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    )}
  </div>
)}
```

#### 5. Layout horizontal responsive

```tsx
{/* Stepper container - horizontal scroll on mobile */}
<div className="relative flex items-start justify-start gap-0 overflow-x-auto pb-20">
  {activeSteps.map((step, index) => (
    <React.Fragment key={step.key}>
      {/* Step column */}
      <div className="flex flex-col items-center relative min-w-[120px]">
        {/* Step box + labels + popup */}
      </div>
      
      {/* Arrow between steps */}
      {index < activeSteps.length - 1 && (
        <div className="flex items-center self-center mt-4 text-gray-300">
          <span className="text-lg">—</span>
          <ChevronRight className="w-4 h-4 -ml-1" />
        </div>
      )}
    </React.Fragment>
  ))}
</div>
```

---

## Resume des changements visuels

| Element | Avant (Leazr) | Apres (WinBroker) |
|---------|---------------|-------------------|
| Boite d'etape | Petit cercle + icone separee | Grande boite avec bordure |
| Numero | Dans le cercle | Badge dans le coin |
| Icone | Petite (w-5 h-5) dans boite grise | Grande (w-8 h-8) centree |
| Etape completee | Cercle vert avec check | Boite avec badge check vert |
| Etape active | Cercle bleu | Boite avec bordure bleue epaisse + ombre |
| Connecteurs | Ligne pointillee + chevron | Fleche simple `—→` |
| Popup | Badge "En cours" + bouton | Menu complet avec 3 actions |
| Statut | Texte simple | Badge colore |

---

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Refonte complete du rendu visuel |

---

## Resultat attendu

Apres cette refonte, le stepper de workflow aura :
- Des boites d'etapes plus grandes et plus visibles
- Des icones prominentes et claires
- Un badge de numero dans le coin de chaque boite
- Une bordure bleue bien visible pour l'etape active
- Un menu d'actions complet attache a l'etape active
- Un design professionnel et moderne alignee avec WinBroker

