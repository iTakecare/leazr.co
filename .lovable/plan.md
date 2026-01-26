
# Plan : Intégration des Boutons "Sans Suite" et "Réactiver" dans la Page Détail

## Résumé

Intégration du bouton "Classer sans suite" et du bouton "Réactiver le dossier" dans la page de détail de l'offre (`AdminOfferDetail.tsx`) et la sidebar des actions (`CompactActionsSidebar.tsx`).

---

## Fichiers à Modifier

| Fichier | Action |
|---------|--------|
| `src/pages/AdminOfferDetail.tsx` | Ajouter le state et le modal NoFollowUpModal |
| `src/components/offers/detail/CompactActionsSidebar.tsx` | Ajouter le bouton "Classer sans suite" et le bouton "Réactiver" |

---

## 1. Modifications de `AdminOfferDetail.tsx`

### Imports à ajouter

```typescript
import NoFollowUpModal from "@/components/offers/detail/NoFollowUpModal";
```

### Nouvel état

```typescript
const [noFollowUpModalOpen, setNoFollowUpModalOpen] = useState(false);
```

### Ajout du modal en fin de composant

Le modal `NoFollowUpModal` sera ajouté après les autres modaux existants (après `EmailOfferDialog`).

### Passage des props à CompactActionsSidebar

Ajouter les props pour gérer l'ouverture du modal et le callback de mise à jour.

---

## 2. Modifications de `CompactActionsSidebar.tsx`

### Imports à ajouter

```typescript
import { UserX } from "lucide-react";
import ReactivateOfferButton from "./ReactivateOfferButton";
```

### Nouvelles props de l'interface

```typescript
interface CompactActionsSidebarProps {
  // ... props existantes
  onClassifyNoFollowUp?: () => void;  // NOUVEAU
  onStatusUpdated?: () => void;        // NOUVEAU
}
```

### Condition d'affichage du bouton "Classer sans suite"

Le bouton sera visible uniquement pour certains statuts actifs (pas pour les statuts déjà terminés ou rejetés) :

```typescript
const canClassifyNoFollowUp = ![
  'without_follow_up',
  'internal_rejected', 
  'leaser_rejected',
  'validated',
  'financed',
  'signed',
  'completed',
  'contract_sent'
].includes(offer.workflow_status);
```

### Bouton "Classer sans suite"

Positionné après le bouton "Supprimer" dans la section Actions :

```tsx
{canClassifyNoFollowUp && onClassifyNoFollowUp && (
  <Button 
    variant="outline" 
    size="sm"
    className="w-full justify-start text-sm h-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300" 
    onClick={onClassifyNoFollowUp}
  >
    <UserX className="w-4 h-4 mr-2" />
    <span>Classer sans suite</span>
  </Button>
)}
```

### Bouton "Réactiver le dossier"

Pour les dossiers `without_follow_up`, le composant `ReactivateOfferButton` sera affiché (il gère lui-même sa visibilité) :

```tsx
<ReactivateOfferButton
  offerId={offer.id}
  currentStatus={offer.workflow_status}
  onStatusUpdated={onStatusUpdated}
  size="sm"
/>
```

---

## 3. Structure Finale de la Sidebar Actions

```text
┌─────────────────────────────────┐
│  Actions                        │
├─────────────────────────────────┤
│  [Modifier]                     │  ← Si éditable
│  [Générer PDF]                  │
│  [Envoyer offre par mail]       │
│  [Ouvrir le lien public]        │
│  [Accéder à l'upload docs]      │  ← Si Score B
│  [Supprimer]                    │
│  [Classer sans suite]           │  ← NOUVEAU (si actif)
│  [Réactiver le dossier]         │  ← NOUVEAU (si without_follow_up)
└─────────────────────────────────┘
```

---

## 4. Flux d'Intégration

```text
AdminOfferDetail.tsx
       │
       ├── State: noFollowUpModalOpen
       │
       ├── CompactActionsSidebar
       │        │
       │        ├── Bouton "Classer sans suite" 
       │        │       → onClick: setNoFollowUpModalOpen(true)
       │        │
       │        └── ReactivateOfferButton (auto-géré)
       │                → onStatusUpdated: fetchOfferDetails
       │
       └── NoFollowUpModal
                │
                ├── isOpen: noFollowUpModalOpen
                ├── onClose: setNoFollowUpModalOpen(false)
                ├── offerId: offer.id
                ├── currentStatus: offer.workflow_status
                └── onStatusUpdated: fetchOfferDetails
```

---

## 5. Détail des Modifications

### `AdminOfferDetail.tsx`

1. Ajouter l'import de `NoFollowUpModal`
2. Ajouter l'état `noFollowUpModalOpen`
3. Passer les nouvelles props à `CompactActionsSidebar` :
   - `onClassifyNoFollowUp={() => setNoFollowUpModalOpen(true)}`
   - `onStatusUpdated={fetchOfferDetails}`
4. Ajouter le composant `<NoFollowUpModal />` après les autres modaux

### `CompactActionsSidebar.tsx`

1. Ajouter les imports (`UserX`, `ReactivateOfferButton`)
2. Étendre l'interface avec les nouvelles props
3. Ajouter la logique `canClassifyNoFollowUp`
4. Ajouter le bouton "Classer sans suite" dans la section Actions
5. Ajouter le `ReactivateOfferButton` après le bouton "Supprimer"

---

## 6. Comportement Attendu

### Dossier Actif (draft, sent, internal_review, etc.)

- Le bouton "Classer sans suite" est visible
- Clic → Ouvre `NoFollowUpModal`
- Après classification → Statut devient `without_follow_up` + Score D

### Dossier "Sans Suite" (without_follow_up)

- Le bouton "Classer sans suite" est masqué
- Le bouton "Réactiver le dossier" est visible
- Clic → Ouvre le dialog de réactivation
- Après réactivation → Statut revient au choix (draft/sent/internal_review)

### Dossier Refusé/Validé/Finalisé

- Ni le bouton "Classer sans suite" ni "Réactiver" ne sont visibles
