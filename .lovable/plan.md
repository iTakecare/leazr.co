
# Ameliorations du systeme de taches -- Phase 2

## Vue d'ensemble

Mise en place de 7 ameliorations majeures du systeme de taches existant : sous-taches, rappels automatiques, modeles de taches, vue calendrier, commentaires avec @mentions, tags, recurrence. Plus des corrections sur le dialogue (recherche client avec autocompletion, selection de dossiers lies au client, filtrage des profils pour exclure ambassadeurs/clients).

---

## 1. Modifications de la base de donnees

### Nouvelles tables

**`task_subtasks`** -- Sous-taches avec checklist

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant |
| task_id | uuid (FK tasks, ON DELETE CASCADE) | Tache parente |
| title | text | Titre de la sous-tache |
| is_completed | boolean (default false) | Cochee ou non |
| position | integer (default 0) | Ordre d'affichage |
| created_at | timestamptz | Date |

**`task_tags`** -- Tags personnalisables

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant |
| company_id | uuid (FK companies) | Isolation par entreprise |
| name | text | Nom du tag |
| color | text (default '#3b82f6') | Couleur hex |
| created_at | timestamptz | Date |

**`task_tag_assignments`** -- Relation N-N taches/tags

| Colonne | Type | Description |
|---------|------|-------------|
| task_id | uuid (FK tasks, ON DELETE CASCADE) | |
| tag_id | uuid (FK task_tags, ON DELETE CASCADE) | |
| PK composite | (task_id, tag_id) | |

**`task_templates`** -- Modeles de taches

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant |
| company_id | uuid (FK companies) | |
| name | text | Nom du modele |
| title | text | Titre par defaut |
| description | text (nullable) | Description |
| priority | text (default 'medium') | Priorite |
| subtasks | jsonb (default '[]') | Liste de sous-taches predefinies |
| tags | jsonb (default '[]') | Tags par defaut |
| created_by | uuid (FK profiles) | Createur |
| created_at | timestamptz | |

### Colonnes ajoutees a `tasks`

| Colonne | Type | Description |
|---------|------|-------------|
| recurrence_type | text (nullable) | `daily`, `weekly`, `monthly`, ou null |
| recurrence_end_date | timestamptz (nullable) | Date de fin de recurrence |
| parent_task_id | uuid (FK tasks, nullable) | Tache parente pour recurrence |
| template_id | uuid (FK task_templates, nullable) | Modele source |

### RLS

- Toutes les nouvelles tables : acces restreint aux `company_id` via jointure sur `tasks` ou directement.
- `task_templates` et `task_tags` : lecture/ecriture pour les profils de la meme `company_id` avec role `admin` ou `super_admin`.

---

## 2. Filtrage des profils assignables

### Probleme actuel
`fetchCompanyProfiles` retourne TOUS les profils de la company, y compris les ambassadeurs et clients.

### Solution
Dans `src/services/taskService.ts`, modifier `fetchCompanyProfiles` pour filtrer par role :
```
.in('role', ['admin', 'super_admin'])
```
Cela exclut les `ambassador` et `client`.

---

## 3. Autocompletion client et dossiers lies

### Dans `TaskDialog.tsx`

- Remplacer le `Select` client par un champ `Input` avec filtre local (les premieres lettres tapees filtrent la liste) -- implementer avec `cmdk` (deja installe) ou un simple input + dropdown filtre.
- Quand un client est selectionne, charger dynamiquement ses contrats et offres depuis Supabase et les afficher dans deux selecteurs "Contrat lie" et "Offre/Demande liee".
- Quand aucun client n'est selectionne, masquer les selecteurs contrat/offre (la tache n'est liee a aucun client -- ex: "contacter le partenaire potentiel").

---

## 4. Sous-taches (checklist)

### Composant `TaskSubtasks.tsx`
- Affiche une checklist de sous-taches dans le dialogue d'edition.
- Permet d'ajouter, supprimer, cocher/decocher, reordonner.
- Progression affichee sur la carte Kanban et la liste (ex: "3/5").

### Service
- CRUD dans `taskService.ts` : `fetchSubtasks`, `addSubtask`, `toggleSubtask`, `deleteSubtask`.

---

## 5. Commentaires avec @mentions

### Composant `TaskComments.tsx`
- Affiche les commentaires existants dans le dialogue de tache.
- Champ de saisie avec detection de `@` pour afficher une liste de collaborateurs.
- A la soumission, detecte les `@prenom nom` et cree une notification pour chaque collaborateur mentionne + envoi d'email.

### Service
- `addComment`, `fetchComments` dans `taskService.ts`.

---

## 6. Tags / Etiquettes

### Composant `TaskTagManager.tsx`
- Selection multiple de tags dans le dialogue de tache.
- Possibilite de creer un nouveau tag (nom + couleur) a la volee.
- Affichage des tags sous forme de badges colores sur les cartes et dans la liste.

### Filtre
- Ajouter un filtre par tag dans `TaskFilters.tsx`.

---

## 7. Modeles de taches

### Composant `TaskTemplateDialog.tsx`
- Dialogue pour creer/editer un modele (titre, description, priorite, sous-taches predefinies, tags).
- Bouton "Creer depuis un modele" dans la page Taches qui ouvre un selecteur de modeles.
- Appliquer un modele = pre-remplir le `TaskDialog` avec les valeurs du modele.

---

## 8. Vue Calendrier

### Composant `TaskCalendar.tsx`
- Vue mensuelle affichant les taches par date d'echeance.
- Utiliser `react-day-picker` (deja installe) pour le rendu calendrier.
- Cliquer sur un jour affiche les taches de ce jour, cliquer sur une tache ouvre le dialogue d'edition.
- Ajouter un 3eme bouton "Calendrier" au toggle de vue dans `Tasks.tsx`.

---

## 9. Recurrence

### Logique
- Quand une tache recurrente est marquee "done", une nouvelle tache est automatiquement creee avec la prochaine date d'echeance (calculee selon `recurrence_type`).
- Implementee dans le hook `useTaskMutations` lors du changement de statut a `done`.
- La recurrence s'arrete si `recurrence_end_date` est depassee.

---

## 10. Rappels automatiques (cron)

### Edge function `task-reminders/index.ts`
- Parcourt les taches avec `due_date` dans les 24h prochaines ou en retard, et dont le statut n'est pas `done`.
- Envoie un email via Resend a l'assigne (et cree une notification in-app).
- Evite les doublons avec un champ `last_reminder_sent` sur la table `tasks`.

### Cron
- Planifie via `pg_cron` pour s'executer une fois par jour (ex: 8h du matin).

---

## 11. Fichiers a creer / modifier

### Nouveaux fichiers

| Fichier | Role |
|---------|------|
| `src/components/tasks/TaskSubtasks.tsx` | Checklist de sous-taches |
| `src/components/tasks/TaskComments.tsx` | Commentaires avec @mentions |
| `src/components/tasks/TaskTagManager.tsx` | Gestion des tags |
| `src/components/tasks/TaskCalendar.tsx` | Vue calendrier |
| `src/components/tasks/TaskTemplateDialog.tsx` | Dialogue de modeles |
| `src/components/tasks/ClientSearchInput.tsx` | Input avec autocompletion client |
| `supabase/functions/task-reminders/index.ts` | Edge function rappels |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/services/taskService.ts` | Filtrer profils par role (exclure ambassador/client), ajouter CRUD sous-taches, commentaires, tags, templates, recurrence |
| `src/components/tasks/TaskDialog.tsx` | Autocompletion client, selecteurs contrat/offre dynamiques, sous-taches, tags, recurrence, modeles |
| `src/components/tasks/TaskCard.tsx` | Affichage tags et progression sous-taches |
| `src/components/tasks/TaskList.tsx` | Affichage tags et progression sous-taches |
| `src/components/tasks/TaskFilters.tsx` | Filtre par tag |
| `src/pages/admin/Tasks.tsx` | Bouton vue calendrier, bouton "depuis modele" |
| `src/hooks/useTasks.ts` | Logique recurrence au changement de statut |
| `supabase/config.toml` | Ajouter config pour `task-reminders` |

### Migration SQL
- 1 migration pour creer les 4 nouvelles tables + ajouter les colonnes a `tasks` + RLS + index.

---

## 12. Ordre d'implementation

1. Migration SQL (tables + colonnes + RLS)
2. Filtrage profils assignables (correction rapide dans `taskService.ts`)
3. Autocompletion client + selecteurs dossiers dynamiques (`ClientSearchInput.tsx` + `TaskDialog.tsx`)
4. Sous-taches (`TaskSubtasks.tsx` + service)
5. Tags (`TaskTagManager.tsx` + service + filtre)
6. Commentaires avec @mentions (`TaskComments.tsx` + service)
7. Modeles de taches (`TaskTemplateDialog.tsx` + service)
8. Vue calendrier (`TaskCalendar.tsx` + `Tasks.tsx`)
9. Recurrence (logique dans `useTasks.ts`)
10. Rappels automatiques (edge function + cron)
