

# Remplacer la timeline client par le stepper Leazr (read-only)

## Problème
Le suivi côté client utilise une timeline verticale simpliste (3 étapes statiques : "Demande soumise", "Examen en cours", "Demande approuvée") qui ne reflète pas les vraies étapes du workflow. Côté admin, le `LeazrWorkflowStepper` affiche les étapes réelles du workflow configuré (Brouillon → Analyse interne → Introduit leaser → Résultat leaser → Contrat prêt).

## Solution
Créer un composant `ClientWorkflowStepper` qui reprend le **design visuel** du `LeazrWorkflowStepper` (cartes horizontales, icônes, connecteurs pointillés, badges de statut) mais en **lecture seule** (pas de boutons d'action, pas de clic pour changer le statut).

### Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/components/client/ClientWorkflowStepper.tsx` | **Créer** - Version read-only du LeazrWorkflowStepper |
| `src/pages/ClientRequestDetailPage.tsx` | **Modifier** - Remplacer `RequestStatusTimeline` par `ClientWorkflowStepper` |

### Détails du `ClientWorkflowStepper`

- Reprend la même logique de résolution des étapes que `LeazrWorkflowStepper` :
  - Utilise `useWorkflowForOfferType` pour charger les étapes réelles du workflow
  - Utilise le même `getCurrentStepIndex` avec le `statusMapping` hiérarchique
  - Mêmes icônes par type d'étape (`getStepIcon`)
- Même rendu visuel : cartes avec bordure orange pour l'étape active, check vert pour les complétées, connecteurs pointillés
- **Pas de** : boutons d'action, `handleStepClick`, modal email, scores, demande de documents, liens "retour à"
- Labels client-friendly : "En cours", "Terminée", "À venir"
- Props : `currentStatus`, `offerType`, `workflowTemplateId`, `companyId`

### Modification de `ClientRequestDetailPage.tsx`

- Remplacer l'import de `RequestStatusTimeline` par `ClientWorkflowStepper`
- Passer `offer.workflow_status`, `offer.type`, `offer.workflow_template_id`, `offer.company_id`
- Retirer la Card wrapper (le stepper a son propre container)

