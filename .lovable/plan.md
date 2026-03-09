

# Ajout de tâche/rappel directement depuis un dossier (demande ou client)

## Objectif
Permettre de créer une tâche (rappel, relance, etc.) directement depuis la page détail d'une **demande** (AdminOfferDetail) ou d'un **client** (ClientDetail), avec pré-remplissage automatique du client et/ou de la demande liée.

## Approche

### 1. Rendre `TaskDialog` utilisable en mode pré-rempli

Ajouter des props optionnelles à `TaskDialog` pour pré-remplir les champs :
- `defaultClientId?: string`
- `defaultClientName?: string`
- `defaultOfferId?: string`
- `defaultTitle?: string`

Quand ces props sont fournies et qu'il n'y a pas de `task` (mode création), les champs seront initialisés avec ces valeurs.

**Fichier** : `src/components/tasks/TaskDialog.tsx`

### 2. Ajouter un bouton "Créer une tâche" dans `CompactActionsSidebar`

Ajouter un bouton avec icône `ClipboardList` dans la sidebar d'actions de la demande, qui ouvre le `TaskDialog` pré-rempli avec :
- `related_client_id` = client de l'offre
- `related_offer_id` = ID de l'offre
- `title` pré-rempli avec "Relance - [nom client]"

Nécessite ajouter une prop `onCreateTask` à `CompactActionsSidebar`, et gérer le state + dialog dans `AdminOfferDetail.tsx`.

**Fichiers** :
- `src/components/offers/detail/CompactActionsSidebar.tsx` — ajouter bouton
- `src/pages/AdminOfferDetail.tsx` — ajouter state, handler, et `TaskDialog`

### 3. Ajouter un bouton "Créer une tâche" dans `ClientDetail`

Ajouter un bouton dans l'en-tête de la page client qui ouvre le `TaskDialog` pré-rempli avec :
- `related_client_id` = ID du client
- `title` pré-rempli avec "Rappel - [nom client]"

**Fichier** : `src/pages/ClientDetail.tsx` — ajouter state, handler, `TaskDialog`, et le hook `useTaskMutations`

### 4. Fichiers impactés (résumé)

| Fichier | Modification |
|---|---|
| `TaskDialog.tsx` | Props optionnelles de pré-remplissage |
| `CompactActionsSidebar.tsx` | Bouton "Créer une tâche" |
| `AdminOfferDetail.tsx` | State + TaskDialog + handler |
| `ClientDetail.tsx` | Bouton + State + TaskDialog + handler |

