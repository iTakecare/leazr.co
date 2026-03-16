

## Problèmes identifiés

1. **"Alain Dien 0"** — Le collaborateur "0" sans nom visible est probablement un collaborateur créé avec un nom vide ou un chiffre. C'est un problème de données, mais aussi de validation manquante dans `CollaboratorCreationDialog`. Le composant actuel n'affiche que `group.collaborator_name` sans fallback.

2. **Layout mono-colonne** — Actuellement tout est empilé verticalement (collaborateurs + non assigné) dans une seule carte. Aucune séparation visuelle entre matériel disponible et collaborateurs.

3. **Pas de modale collaborateur** — On ne peut pas cliquer sur un collaborateur pour voir ses détails, ajouter des tags, ou voir l'historique des swaps.

## Plan de refonte — Layout deux colonnes avec drag-drop

### 1. Refonte du layout `EquipmentDragDropManager.tsx`

Remplacer le layout mono-colonne par un **split en deux colonnes** dans un seul `DragDropContext` :

```text
┌─────────────────────────┬──────────────────────────────┐
│  MATÉRIEL NON ASSIGNÉ   │     COLLABORATEURS           │
│  (Droppable: unassigned)│                              │
│                         │  ┌──────────────────────┐    │
│  ┌─────────────────┐    │  │ 👤 John Doe     [3]  │    │
│  │ MacBook Pro 14"  │←──┼──│  Droppable zone      │    │
│  │ S/N: ABC123      │    │  │  - iPhone 15 Pro     │    │
│  │ Contrat #4521    │    │  │  - iPad Air           │    │
│  └─────────────────┘    │  └──────────────────────┘    │
│  ┌─────────────────┐    │  ┌──────────────────────┐    │
│  │ iPhone 15        │    │  │ 👤 Alain Dien   [0]  │    │
│  └─────────────────┘    │  │  Droppable zone      │    │
│                         │  └──────────────────────┘    │
│                         │                              │
│                         │  [+ Ajouter collaborateur]   │
└─────────────────────────┴──────────────────────────────┘
```

- Colonne gauche (1/3) : matériel non assigné avec icônes, numéros de série, badges contrat
- Colonne droite (2/3) : collaborateurs avec zones de drop, cliquables pour ouvrir la modale

### 2. Modale collaborateur `CollaboratorDetailModal.tsx` (nouveau)

Modale ouverte au clic sur un collaborateur, contenant :

- **Infos** : nom, email, téléphone, rôle, département
- **Tags** : système de tags libres (ex: "VIP", "Remote", "IT") avec ajout/suppression — stockés dans une colonne `tags` (jsonb) sur la table `collaborators`
- **Équipements assignés** : liste du matériel avec dates d'assignation
- **Historique de swaps** : timeline des changements d'assignation via `equipment_assignments_history`, montrant "MacBook Pro assigné le 12/01 → retiré le 15/03" avec dates formatées
- **Actions** : éditer les infos, supprimer le collaborateur

### 3. Améliorations visuelles

- Cartes équipement enrichies : icône selon type (laptop/phone/tablet), badge contrat, numéro de série en mono
- Animation de drag plus fluide avec ombre portée et rotation légère
- Zone de drop avec highlight coloré et texte "Déposez ici"
- Avatars collaborateurs avec initiales colorées
- Compteur d'équipements en badge sur chaque collaborateur

### 4. Validation des données

- `CollaboratorCreationDialog` : validation que le nom n'est pas vide/numérique
- Fallback d'affichage : si le nom est vide, afficher l'email ou "Collaborateur sans nom"

### 5. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/equipment/EquipmentDragDropManager.tsx` | Refonte layout 2 colonnes |
| `src/components/equipment/CollaboratorDetailModal.tsx` | Nouveau — modale détail collaborateur |
| `src/components/equipment/CollaboratorCard.tsx` | Nouveau — carte collaborateur cliquable |
| `src/components/equipment/UnassignedEquipmentPanel.tsx` | Nouveau — panneau gauche matériel libre |
| `src/components/equipment/CollaboratorCreationDialog.tsx` | Ajout validation nom |
| `src/services/collaboratorEquipmentService.ts` | Ajout méthodes tags + update collaborateur |

### Suggestions d'améliorations futures

- **Export PDF** du parc par collaborateur
- **Notifications** quand un équipement est swappé
- **QR Code** par équipement pour scan rapide
- **Filtres** par type d'équipement ou contrat dans la colonne gauche

