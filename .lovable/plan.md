

## Plan : Modales interactives pour les actions email (tâche + liaison client)

### Problème
Actuellement, "Créer une tâche" insère directement en base sans modale, et "Lier l'email au dossier" affiche juste un toast sans rien faire.

### Solution

**1. Bouton "Créer une tâche" → ouvre TaskDialog pré-rempli**

Dans `EmailDetail.tsx` :
- Ajouter un état `taskDialogOpen` + importer `TaskDialog` et `useTaskMutations`
- Remplacer l'appel direct `createTaskFromEmail.mutate()` par `setTaskDialogOpen(true)`
- Même chose pour l'action IA `create_task`
- Rendre le `TaskDialog` avec props pré-remplies :
  - `defaultTitle` = sujet de l'email
  - `defaultClientId` = `aiSuggestions.matched_client_id` (si détecté)
  - `defaultClientName` = `aiSuggestions.matched_client_name`
  - Description pré-remplie avec contexte email (expéditeur + résumé IA si dispo)
- Au `onSubmit`, lier la tâche créée à l'email (`linked_task_id`)

**2. Action "link_client" → modale de recherche client**

Dans `EmailDetail.tsx` :
- Ajouter un état `linkClientDialogOpen`
- Créer un `Dialog` avec le composant `ClientSearchInput` existant pour rechercher/sélectionner un client
- Au choix du client, mettre à jour `synced_emails.linked_client_id` (colonne à ajouter si absente) et afficher un toast de confirmation
- L'action IA `link_client` ouvre cette modale au lieu d'afficher un toast

**3. Migration SQL** (si `linked_client_id` n'existe pas)
- `ALTER TABLE synced_emails ADD COLUMN linked_client_id uuid REFERENCES clients(id);`

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/support/EmailDetail.tsx` | Ajouter TaskDialog + Dialog liaison client, remplacer les actions directes par ouverture de modales |
| Migration SQL | Ajouter colonne `linked_client_id` à `synced_emails` |

