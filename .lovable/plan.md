

## Plan : Pré-remplir la description de la tâche avec l'analyse IA + Lier l'email à un dossier (offre/contrat)

### Changement 1 : Description pré-remplie dans TaskDialog

**`src/components/tasks/TaskDialog.tsx`** :
- Ajouter une prop `defaultDescription?: string`
- Dans le `useEffect` (ligne 106-121), initialiser `setDescription(defaultDescription || '')` quand `!task`

**`src/components/support/EmailDetail.tsx`** :
- Passer `defaultDescription={buildTaskDescription()}` au `TaskDialog` (ligne 314-322)
- Enrichir `buildTaskDescription()` avec plus de données IA : sentiment, type de demande, topics, actions suggérées

### Changement 2 : Lier l'email à une offre ou un contrat (pas au client)

**Migration SQL** :
- Remplacer `linked_client_id` par `linked_offer_id` (uuid, ref `offers`) et `linked_contract_id` (uuid, ref `contracts`)

**`src/components/support/EmailDetail.tsx`** :
- Refondre la modale de liaison en 2 étapes :
  1. Sélection client via `ClientSearchInput` (déjà en place)
  2. Après sélection, charger les offres + contrats du client via `fetchClientOffers` / `fetchClientContracts` (déjà disponibles dans `taskService`)
  3. Afficher la liste des dossiers avec radio pour choisir
- Au clic "Lier", enregistrer `linked_offer_id` ou `linked_contract_id` dans `synced_emails`
- Mettre à jour le label du bouton ("Lier à un dossier" / "Dossier lié")

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/tasks/TaskDialog.tsx` | Ajouter prop `defaultDescription`, l'utiliser dans le reset |
| `src/components/support/EmailDetail.tsx` | Enrichir `buildTaskDescription()`, passer `defaultDescription`, refondre modale liaison en 2 étapes (client → dossier) |
| Migration SQL | `DROP linked_client_id`, `ADD linked_offer_id uuid`, `ADD linked_contract_id uuid` |

