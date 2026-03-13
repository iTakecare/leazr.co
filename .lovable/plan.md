

# Plan : Renommage WinBroker → Leazr + Correction stepper "Contrat prêt"

## 1. Renommage de tous les fichiers et références WinBroker

### Fichier renommé
- `src/components/offers/detail/WinBrokerWorkflowStepper.tsx` → `src/components/offers/detail/LeazrWorkflowStepper.tsx`

### Références à mettre à jour
| Fichier | Modification |
|---|---|
| `LeazrWorkflowStepper.tsx` (ex-WinBroker) | Renommer interface `WinBrokerWorkflowStepperProps` → `LeazrWorkflowStepperProps`, composant `WinBrokerWorkflowStepper` → `LeazrWorkflowStepper`, tous les commentaires "WinBroker style" → "Leazr style" |
| `src/pages/AdminOfferDetail.tsx` | Mettre à jour l'import et les 2 commentaires mentionnant WinBroker |
| `tailwind.config.ts` | Renommer le commentaire "WinBroker style" → "Leazr style" (ligne 55) |

## 2. Correction du step "Contrat prêt" qui ne s'affiche pas comme actif

### Problème identifié
Après la transition vers `offer_validation`, le `handleStatusChange` fait un `setOffer({...offer, workflow_status: 'offer_validation'})`. Le mapping dans `getCurrentStepIndex` mappe `offer_validation` → `validated` et cherche un step avec `key === 'validated'` — ce step existe bien dans la DB.

Le problème réel est que `setOffer({...offer, ...})` utilise une **closure stale** de `offer` dans le callback. Si `offer` n'a pas changé entre le moment où le callback est créé et le moment où il est appelé, tout va bien. Mais si d'autres mises à jour d'état modifient `offer` entre-temps, la version dans la closure est périmée.

### Correction
1. Dans `AdminOfferDetail.tsx`, modifier `handleStatusChange` pour utiliser le pattern fonctionnel de setState :
```typescript
const handleStatusChange = (newStatus: string) => {
  setOffer(prev => prev ? { ...prev, workflow_status: newStatus } : prev);
};
```

2. Ajouter un `fetchOfferDetails()` après le changement de statut dans `handleSendEmailAndValidate` et `handleValidateWithoutEmail` du stepper, pour garantir un rafraîchissement complet depuis la DB. Passer `onRefresh` comme prop au stepper.

3. Dans le stepper `LeazrWorkflowStepper.tsx`, après `onStatusChange?.('offer_validation')`, appeler aussi `onRefresh?.()` pour forcer un rechargement complet de l'offre.

### Props ajoutée
- `onRefresh?: () => void` sur le stepper, branché sur `fetchOfferDetails` dans `AdminOfferDetail`

## 3. Même correction pour InteractiveWorkflowStepper

Appliquer la même logique de `onRefresh` et le même fix de closure stale.

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `WinBrokerWorkflowStepper.tsx` → `LeazrWorkflowStepper.tsx` | Renommage complet + ajout prop `onRefresh` + appel après validation |
| `InteractiveWorkflowStepper.tsx` | Ajout prop `onRefresh` + appel après validation |
| `AdminOfferDetail.tsx` | Import renommé, `handleStatusChange` fonctionnel, passage de `onRefresh={fetchOfferDetails}` |
| `tailwind.config.ts` | Commentaire renommé |

