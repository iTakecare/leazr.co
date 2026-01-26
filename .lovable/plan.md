

# Plan : Refonte de la page "Détail de demande" style WinBroker

## Objectif

Adapter la page de détail d'offre de Leazr pour qu'elle ressemble à celle de WinBroker, avec un focus particulier sur le composant de progression du workflow.

---

## Analyse comparative

### Design WinBroker (cible)

**En-tête :**
- Titre avec ID court (REQ-MKV4XR1V)
- Badge de statut coloré (Nouvelle demande - bleu)
- Description sous le titre
- Menu "..." à droite

**Stepper de progression :**
- Section "Progression du workflow" avec titre et nom du workflow
- Etapes numérotées (1, 2, 3, 4, 5, 6, 7)
- Icônes dans des cercles gris clair
- Connecteurs en pointillés avec flèches (- - - →)
- Etape active : cercle bleu avec popup/tooltip montrant :
  - Badge "En cours"
  - Bouton "Vers [prochaine étape] →"
- Etapes futures : icône + titre + "À venir" en gris
- Etapes complètes : cercle vert avec check

**Layout principal :**
- Card "Informations" à gauche avec champs en grille
- Card "Client" à droite en sidebar

### Design Leazr actuel

- Stepper horizontal avec boutons circulaires colorés (vert/bleu/gris)
- Lignes de progression pleines
- Badges sous chaque étape
- Tabs pour la navigation (Vue d'ensemble, Financier, Documents...)
- Sidebar à droite avec Statut, Actions, Détails

---

## Modifications à apporter

### 1. Nouveau composant `WinBrokerWorkflowStepper`

Créer un nouveau stepper qui reproduit le design WinBroker :

```text
Structure visuelle :

  (1)  - - → (2) - - → (3) - - → (4) - - → (5) - - → (6) - - → (7)
  [●]        ○          ○          ○          ○          ○          ○
  📄        📋         📬         💼         ✍️         ✓          📞
  Brouillon Collecte   Etude     Proposition Signature  Cloturé   Contact
  En cours  À venir    À venir   À venir     À venir    À venir   À venir
  ┌─────────────┐
  │ En cours    │
  │ Vers xxx →  │
  └─────────────┘
```

**Caractéristiques :**
- Numéros d'étapes dans des cercles
- Connecteurs en pointillés avec flèches
- Popup sur l'étape active avec :
  - Badge de statut
  - Bouton d'action vers l'étape suivante
- Texte "À venir" pour les étapes futures
- Style épuré, pas de couleurs vives sauf bleu pour l'étape active

### 2. Refonte de l'en-tête de page

Modifier la section header dans `AdminOfferDetail.tsx` :
- Ajouter un bouton retour avec flèche (←)
- Titre : ID de l'offre avec badge de statut à côté
- Sous-titre : description/type de l'offre
- Menu d'actions "..." à droite

### 3. Réorganisation du layout

**Section principale :**
- Card "Informations client" avec design grille 2 colonnes
- Formulaire propre avec labels en haut des champs

**Sidebar droite :**
- Card "Client" avec :
  - Sélecteur de client
  - Email cliquable
  - Téléphone cliquable
  - Bouton "Voir la fiche client"

### 4. Mise à jour des styles de composants

- Cards : bordures très subtiles, ombres légères
- Titres de sections avec icônes
- Espacements généreux
- Typographie cohérente

---

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` | Créer | Nouveau stepper style WinBroker |
| `src/pages/AdminOfferDetail.tsx` | Modifier | Intégrer le nouveau stepper et refonte header |
| `src/components/offers/detail/ClientSection.tsx` | Modifier | Design WinBroker pour la card client |
| `src/components/offers/detail/CompactActionsSidebar.tsx` | Modifier | Simplifier et adapter au nouveau style |

---

## Détails techniques

### Composant `WinBrokerWorkflowStepper`

```typescript
interface WinBrokerWorkflowStepperProps {
  currentStatus: string;
  offerId: string;
  onStatusChange?: (status: string) => void;
  internalScore?: 'A' | 'B' | 'C' | null;
  leaserScore?: 'A' | 'B' | 'C' | null;
  onAnalysisClick?: (analysisType: 'internal' | 'leaser') => void;
  offer?: any;
}

// Structure d'une étape
interface WorkflowStep {
  number: number;
  key: string;
  label: string;
  icon: LucideIcon;
  status: 'completed' | 'current' | 'upcoming';
}
```

**Rendu visuel :**

```tsx
<div className="bg-white rounded-lg border p-6">
  {/* Titre de section */}
  <div className="flex items-center gap-2 mb-6">
    <GitBranch className="w-5 h-5 text-primary" />
    <h3 className="text-lg font-semibold">Progression du workflow</h3>
    <span className="text-sm text-muted-foreground">• {workflowName}</span>
  </div>

  {/* Stepper horizontal */}
  <div className="relative flex items-start justify-between">
    {steps.map((step, index) => (
      <div key={step.key} className="flex flex-col items-center relative flex-1">
        {/* Numéro dans cercle */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
          step.status === 'completed' && "bg-green-500 border-green-500 text-white",
          step.status === 'current' && "bg-primary border-primary text-white",
          step.status === 'upcoming' && "bg-gray-50 border-gray-200 text-gray-400"
        )}>
          {step.status === 'completed' ? <Check className="w-4 h-4" /> : step.number}
        </div>

        {/* Connecteur pointillé */}
        {index < steps.length - 1 && (
          <div className="absolute left-1/2 top-4 w-full flex items-center">
            <div className="flex-1 border-t-2 border-dashed border-gray-300" />
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        )}

        {/* Icône de l'étape */}
        <div className="mt-3 p-2 rounded-lg bg-gray-50">
          <step.icon className="w-5 h-5 text-gray-500" />
        </div>

        {/* Label */}
        <span className="mt-2 text-sm font-medium text-center">{step.label}</span>
        
        {/* Sous-label statut */}
        <span className={cn(
          "text-xs",
          step.status === 'current' ? "text-primary" : "text-muted-foreground"
        )}>
          {step.status === 'completed' ? 'Terminé' : 
           step.status === 'current' ? 'En cours' : 'À venir'}
        </span>

        {/* Popup pour étape active */}
        {step.status === 'current' && (
          <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-lg p-3 min-w-[180px] z-10">
            <Badge className="mb-2">En cours</Badge>
            <Button size="sm" className="w-full" onClick={() => goToNextStep()}>
              Vers {nextStepLabel} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    ))}
  </div>
</div>
```

### Modification de `AdminOfferDetail.tsx`

**Nouveau header :**

```tsx
{/* Header épuré style WinBroker */}
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    <Button variant="ghost" size="sm" onClick={() => navigateToAdmin("offers")}>
      <ArrowLeft className="w-4 h-4" />
    </Button>
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">
          {offer.dossier_number || `Offre #${offer.id?.slice(0, 8)}`}
        </h1>
        <Badge className="bg-primary/10 text-primary border-primary/20">
          {getStatusLabel(offer.workflow_status)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {offer.client_name} • {translateOfferType(offer.type)}
      </p>
    </div>
  </div>
  <Button variant="ghost" size="icon">
    <MoreHorizontal className="w-5 h-5" />
  </Button>
</div>
```

### Modification de `ClientSection.tsx`

Style WinBroker avec layout plus épuré :

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-base">
      <User className="w-4 h-4" />
      Client
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Sélecteur/nom du client */}
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{offer.client_name}</span>
    </div>

    {/* Email */}
    <a href={`mailto:${offer.client_email}`} 
       className="flex items-center gap-2 text-sm text-primary hover:underline">
      <Mail className="w-4 h-4" />
      {offer.client_email}
    </a>

    {/* Téléphone */}
    <a href={`tel:${offer.client_phone}`}
       className="flex items-center gap-2 text-sm text-primary hover:underline">
      <Phone className="w-4 h-4" />
      {offer.client_phone}
    </a>

    {/* Bouton fiche client */}
    <Button variant="outline" className="w-full" asChild>
      <Link to={`/${companySlug}/admin/clients/${offer.client_id}`}>
        <ExternalLink className="w-4 h-4 mr-2" />
        Voir la fiche client
      </Link>
    </Button>
  </CardContent>
</Card>
```

---

## Résultat attendu

Après ces modifications, la page de détail d'offre Leazr aura :

- **Header épuré** avec ID, badge de statut, et description
- **Stepper de workflow style WinBroker** avec :
  - Numéros d'étapes dans des cercles
  - Connecteurs en pointillés avec flèches
  - Popup sur l'étape active avec action rapide
  - Labels "En cours" / "À venir" / "Terminé"
- **Layout propre** avec cards blanches et ombres subtiles
- **Card Client** dans la sidebar avec liens cliquables
- **Design cohérent** avec le reste de la refonte WinBroker

Le design sera professionnel, moderne, et offrira une meilleure lisibilité de la progression du dossier.

