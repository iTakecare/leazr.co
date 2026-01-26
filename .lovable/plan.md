
# Plan : Adapter la Page Détail de l'Offre pour Mobile

## Problème Identifié

La page `AdminOfferDetail.tsx` affiche actuellement une interface desktop complexe sur mobile :
- Grille à 4 colonnes qui ne s'adapte pas
- 5 onglets horizontaux trop étroits sur mobile
- Stepper de workflow illisible
- Sidebar d'actions qui s'empile mal
- Contenu qui déborde horizontalement

## Solution

Créer un composant `MobileOfferDetailPage` dédié et l'afficher conditionnellement dans `AdminOfferDetail.tsx` avec `useIsMobile()`.

---

## Architecture Mobile Proposée

```text
┌─────────────────────────────────────────────────────────────┐
│  ←       Offre #DEM-2024-001                    ⋮          │  ← Header simplifié
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 Jean Dupont                                      │   │  ← Card Client
│  │    Entreprise SARL                                  │   │
│  │    📧 jean@example.com  📞 Appeler                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Statut actuel                                    │   │
│  │    ● Analyse interne                                │   │  ← Status Badge
│  │    [Voir progression →]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💰 Résumé financier                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Montant achat      │  15 000 €                      │   │
│  │ Mensualité         │  450 €/mois                    │   │
│  │ Marge              │  2 500 € (16.7%)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📦 Équipements (3)                          [Voir]  │   │
│  │    MacBook Pro M2 (x2)                              │   │
│  │    iPhone 15 Pro (x1)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐               │
│  │  📄   │ │  📧   │ │  ✏️   │ │  ⋮   │               │  ← Actions rapides
│  │  PDF  │ │ Email │ │ Modif │ │ Plus │               │
│  └───────┘ └───────┘ └───────┘ └───────┘               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🏠     📋     [+]     📁     👤                           │  ← Bottom Nav
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/components/mobile/pages/MobileOfferDetailPage.tsx` | Page détail offre mobile |
| `src/components/mobile/cards/MobileOfferDetailCard.tsx` | Card résumé offre |
| `src/components/mobile/MobileWorkflowStatus.tsx` | Affichage compact du statut workflow |
| `src/components/mobile/MobileActionsSheet.tsx` | Bottom sheet pour actions supplémentaires |

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/AdminOfferDetail.tsx` | Ajouter `useIsMobile()` + rendu conditionnel |
| `src/components/mobile/pages/index.ts` | Ajouter export MobileOfferDetailPage |

---

## Composants Mobile du Détail Offre

### 1. Header Mobile Simplifié
- Bouton retour (←) à gauche
- Titre de l'offre centré
- Menu d'actions (⋮) à droite

### 2. Card Client Compacte
- Avatar + Nom + Entreprise
- Boutons d'action directe : 📧 Email | 📞 Appeler
- Cliquable pour voir la fiche client

### 3. Statut Workflow Compact
- Badge coloré avec statut actuel
- Bouton "Voir progression" qui ouvre un drawer avec le stepper vertical
- Scores A/B/C affichés si présents

### 4. Résumé Financier Mobile
- 3 métriques principales en liste verticale
- Montant d'achat
- Mensualité  
- Marge (€ et %)

### 5. Liste Équipements Compacte
- Titre avec compteur "(3 équipements)"
- Liste scrollable des noms d'équipements
- Bouton "Voir détails" qui ouvre un drawer

### 6. Actions Rapides (Grille 4 boutons)
- 📄 Générer PDF
- 📧 Envoyer email
- ✏️ Modifier
- ⋮ Plus d'actions (ouvre drawer)

### 7. Drawer Actions Supplémentaires
- Voir le lien public
- Supprimer l'offre
- Classer sans suite
- Réactiver (si applicable)
- Modifier les dates

---

## Logique d'Intégration dans AdminOfferDetail.tsx

```typescript
import { useIsMobile } from "@/hooks/use-mobile";
import MobileOfferDetailPage from "@/components/mobile/pages/MobileOfferDetailPage";

const AdminOfferDetail = () => {
  const isMobile = useIsMobile();
  const { id } = useParams();
  
  // ... hooks existants (offer, leaser, loading, etc.)
  
  if (isMobile && offer) {
    return (
      <MobileOfferDetailPage
        offer={offer}
        leaser={leaser}
        onGeneratePDF={handleGeneratePDF}
        onSendEmail={() => setEmailDialogOpen(true)}
        onEdit={handleEditOffer}
        onDelete={handleDeleteOffer}
        onStatusChange={handleStatusChange}
        onRefresh={fetchOfferDetails}
        loading={loading}
        error={error}
      />
    );
  }
  
  // Rendu desktop actuel
  return (
    <PageTransition>
      ...
    </PageTransition>
  );
};
```

---

## Structure de MobileOfferDetailPage

```typescript
const MobileOfferDetailPage = ({
  offer,
  leaser,
  onGeneratePDF,
  onSendEmail,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
  loading,
  error
}) => {
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState(false);
  const [showEquipmentDrawer, setShowEquipmentDrawer] = useState(false);
  const [showActionsDrawer, setShowActionsDrawer] = useState(false);
  const { navigateToAdmin } = useRoleNavigation();

  if (loading) {
    return <MobileLoadingState />;
  }

  if (error || !offer) {
    return <MobileErrorState error={error} onBack={() => navigateToAdmin('offers')} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header avec retour */}
      <MobileDetailHeader 
        title={offer.dossier_number || `Offre #${offer.id?.slice(0,8)}`}
        onBack={() => navigateToAdmin('offers')}
        onMoreActions={() => setShowActionsDrawer(true)}
      />
      
      <div className="pt-14 pb-20 px-4 space-y-4">
        {/* Card Client */}
        <MobileClientCard client={{...}} onCall={...} onEmail={...} />
        
        {/* Statut Workflow */}
        <MobileWorkflowStatus 
          status={offer.workflow_status}
          scores={{ internal: offer.internal_score, leaser: offer.leaser_score }}
          onClick={() => setShowWorkflowDrawer(true)}
        />
        
        {/* Résumé Financier */}
        <MobileFinancialSummary
          purchaseAmount={totals.totalPurchasePrice}
          monthlyPayment={totals.totalMonthlyPayment}
          margin={displayMargin}
          marginPercent={marginPercentage}
        />
        
        {/* Équipements */}
        <MobileEquipmentList
          equipment={offer.equipment_data || []}
          onClick={() => setShowEquipmentDrawer(true)}
        />
        
        {/* Actions Rapides */}
        <MobileQuickActions
          onPDF={onGeneratePDF}
          onEmail={onSendEmail}
          onEdit={onEdit}
          onMore={() => setShowActionsDrawer(true)}
        />
      </div>

      {/* Drawers */}
      <MobileWorkflowDrawer 
        open={showWorkflowDrawer} 
        onClose={() => setShowWorkflowDrawer(false)}
        status={offer.workflow_status}
        onStatusChange={onStatusChange}
      />
      
      <MobileEquipmentDrawer
        open={showEquipmentDrawer}
        onClose={() => setShowEquipmentDrawer(false)}
        equipment={offer.equipment_data || []}
      />
      
      <MobileActionsDrawer
        open={showActionsDrawer}
        onClose={() => setShowActionsDrawer(false)}
        onDelete={onDelete}
        onClassifyNoFollowUp={...}
        onViewPublicLink={...}
      />
    </div>
  );
};
```

---

## Sous-Composants à Créer

### MobileDetailHeader
```typescript
// Header spécifique aux pages de détail
<header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b flex items-center px-4">
  <button onClick={onBack}><ArrowLeft /></button>
  <h1 className="flex-1 text-center font-semibold truncate">{title}</h1>
  <button onClick={onMoreActions}><MoreVertical /></button>
</header>
```

### MobileWorkflowStatus
```typescript
// Affichage compact du statut
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Statut actuel</p>
      <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
    </div>
    <Button variant="ghost" size="sm">
      Voir progression <ChevronRight />
    </Button>
  </div>
  {(scores.internal || scores.leaser) && (
    <div className="mt-2 flex gap-2">
      {scores.internal && <Badge>Score interne: {scores.internal}</Badge>}
      {scores.leaser && <Badge>Score leaser: {scores.leaser}</Badge>}
    </div>
  )}
</Card>
```

### MobileFinancialSummary
```typescript
// Résumé financier vertical
<Card>
  <CardHeader><CardTitle>Résumé financier</CardTitle></CardHeader>
  <CardContent className="space-y-3">
    <div className="flex justify-between">
      <span>Montant d'achat</span>
      <span className="font-semibold">{formatCurrency(purchaseAmount)}</span>
    </div>
    <div className="flex justify-between">
      <span>Mensualité</span>
      <span className="font-semibold">{formatCurrency(monthlyPayment)}/mois</span>
    </div>
    <Separator />
    <div className="flex justify-between text-primary">
      <span>Marge</span>
      <span className="font-bold">{formatCurrency(margin)} ({marginPercent.toFixed(1)}%)</span>
    </div>
  </CardContent>
</Card>
```

### MobileQuickActions
```typescript
// Grille de 4 boutons d'action
<div className="grid grid-cols-4 gap-2">
  <Button variant="outline" onClick={onPDF} className="flex-col h-16">
    <FileText className="h-5 w-5 mb-1" />
    <span className="text-xs">PDF</span>
  </Button>
  <Button variant="outline" onClick={onEmail} className="flex-col h-16">
    <Mail className="h-5 w-5 mb-1" />
    <span className="text-xs">Email</span>
  </Button>
  <Button variant="outline" onClick={onEdit} className="flex-col h-16">
    <Edit className="h-5 w-5 mb-1" />
    <span className="text-xs">Modifier</span>
  </Button>
  <Button variant="outline" onClick={onMore} className="flex-col h-16">
    <MoreHorizontal className="h-5 w-5 mb-1" />
    <span className="text-xs">Plus</span>
  </Button>
</div>
```

---

## Résultat Attendu

L'interface mobile de la page détail offre sera :
- **Verticale** : Toutes les informations empilées
- **Tactile** : Boutons larges, zones cliquables généreuses
- **Fluide** : Drawers pour les informations détaillées
- **Rapide** : Actions principales accessibles en 1 tap
- **Cohérente** : Même look que les autres pages mobiles (Offres, Contrats, etc.)

---

## Ordre d'Implémentation

1. Créer `MobileOfferDetailPage.tsx` avec structure de base
2. Créer les sous-composants (Header, WorkflowStatus, FinancialSummary, etc.)
3. Créer les drawers (Workflow, Equipment, Actions)
4. Modifier `AdminOfferDetail.tsx` pour le rendu conditionnel
5. Ajouter l'export dans `index.ts`
6. Tester sur mobile
