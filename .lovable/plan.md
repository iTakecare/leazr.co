

# Réduire la taille du stepper détail + Utiliser MiniWorkflowStepper sur le dashboard

## Problème
1. **Page détail** : Les cartes du `ClientWorkflowStepper` sont trop grandes (140px min, icônes 8x8, padding p-4)
2. **Dashboard** : Le "Suivi détaillé" utilise un stepper statique hardcodé (`WORKFLOW_STEPS` avec 8 étapes fixes) au lieu du `MiniWorkflowStepper` dynamique qui charge les vraies étapes du workflow

## Modifications

### 1. `src/components/client/ClientWorkflowStepper.tsx` — Réduire les dimensions
- Cartes : `min-w-[140px] min-h-[120px] p-4` → `min-w-[100px] min-h-[80px] p-2`
- Colonnes : `min-w-[120px]` → `min-w-[90px]`
- Icônes : `w-8 h-8` → `w-5 h-5`, padding `p-3` → `p-2`
- Badges numérotés : `w-6 h-6` → `w-5 h-5`
- Labels : `text-sm` → `text-xs`, `max-w-[120px]` → `max-w-[90px]`
- Connecteur : `mt-14` → `mt-10`
- Header : `mb-6` → `mb-4`, padding container `p-6` → `p-4`

### 2. `src/pages/ClientDashboard.tsx` — Remplacer le stepper statique par `MiniWorkflowStepper`
- Importer `MiniWorkflowStepper` depuis `@/components/client/MiniWorkflowStepper`
- Dans la section "Suivi détaillé", remplacer le rendu inline des `WORKFLOW_STEPS` par :
  ```tsx
  <MiniWorkflowStepper
    currentStatus={offer.workflow_status || offer.status || 'draft'}
    offerType={offer.type}
    workflowTemplateId={offer.workflow_template_id}
    companyId={offer.company_id}
  />
  ```
- Supprimer les constantes `WORKFLOW_STEPS`, `WORKFLOW_STATUS_MAP` et `getStepIndex` devenues inutiles
- S'assurer que `pendingOffers` expose `workflow_template_id` et `company_id` (déjà présents via `useClientOffers`)

