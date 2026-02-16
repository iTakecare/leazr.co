
# Systeme de Todo List collaborative avec notifications

## Vue d'ensemble

Mise en place d'un systeme de gestion de taches (Todo List) permettant aux collaborateurs d'assigner des taches entre eux, avec notifications in-app et par email, et liens vers le CRM (clients, contrats, offres/demandes).

---

## 1. Base de donnees

### Table `tasks`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| company_id | uuid (FK companies) | Isolation par entreprise |
| title | text | Titre de la tache |
| description | text (nullable) | Description detaillee |
| status | text | `todo`, `in_progress`, `done` |
| priority | text | `low`, `medium`, `high`, `urgent` |
| created_by | uuid (FK profiles) | Createur de la tache |
| assigned_to | uuid (FK profiles, nullable) | Collaborateur assigne |
| due_date | timestamptz (nullable) | Date d'echeance |
| related_client_id | uuid (FK clients, nullable) | Lien vers un client |
| related_contract_id | uuid (FK contracts, nullable) | Lien vers un contrat |
| related_offer_id | uuid (FK offers, nullable) | Lien vers une offre/demande |
| created_at | timestamptz | Date de creation |
| updated_at | timestamptz | Date de mise a jour |
| completed_at | timestamptz (nullable) | Date de completion |

RLS : acces restreint aux membres de la meme `company_id`.

### Table `task_comments`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant |
| task_id | uuid (FK tasks) | Tache associee |
| user_id | uuid (FK profiles) | Auteur du commentaire |
| content | text | Contenu |
| created_at | timestamptz | Date |

### Table `task_notifications`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant |
| task_id | uuid (FK tasks) | Tache concernee |
| user_id | uuid (FK profiles) | Destinataire |
| type | text | `assigned`, `comment`, `status_change`, `due_soon`, `overdue` |
| message | text | Message de notification |
| is_read | boolean | Lu ou non |
| created_at | timestamptz | Date |

---

## 2. Interface utilisateur

### Page principale `/admin/tasks`

- **Bascule Liste / Kanban** via un toggle (comme la page Offres existante)
- Ajout d'un lien "Taches" dans la sidebar avec badge de notifications non lues

### Vue Liste

- Tableau avec colonnes : Titre, Assigne a, Priorite, Echeance, Lien (client/contrat/offre), Statut
- Filtres : par statut, priorite, assigne, client lie
- Tri par echeance, priorite, date de creation

### Vue Kanban

- 3 colonnes : **A faire** | **En cours** | **Termine**
- Drag & drop entre colonnes (reutilisation du pattern `react-beautiful-dnd` deja en place pour les offres)
- Cartes affichant : titre, assigne (avatar), priorite (badge couleur), echeance, lien vers client/contrat

### Dialogue de creation/edition

- Champs : titre, description (rich text optionnel), priorite, date d'echeance
- Selecteur d'assignation : liste des collaborateurs de la meme entreprise
- Selecteurs optionnels de liens :
  - Client (recherche dans la table `clients`)
  - Contrat (filtre par client selectionne si applicable)
  - Offre/Demande (idem)

---

## 3. Notifications

### In-app (temps reel)

- Badge sur l'item "Taches" dans la sidebar (meme pattern que `SidebarNotificationBadge`)
- Abonnement Supabase Realtime sur `task_notifications` filtre par `user_id`
- Toast (sonner) a la reception d'une nouvelle notification
- Centre de notifications dans la page taches avec marquage "lu"

### Par email

- Reutilisation de l'edge function `send-email` existante
- Envoi d'un email lors de :
  - Assignation d'une tache
  - Commentaire sur une tache assignee
  - Tache en retard (via un cron optionnel, phase 2)
- Template simple : titre de la tache, description, lien direct vers la tache

---

## 4. Liens CRM

- Clic sur le lien client dans une tache : navigation vers `/clients/{id}`
- Clic sur le lien contrat : navigation vers `/contracts/{id}`
- Clic sur le lien offre : navigation vers `/offers/{id}`
- Depuis la page d'un client/contrat/offre, affichage d'un encart "Taches liees" listant les taches associees

---

## 5. Fichiers a creer/modifier

### Nouveaux fichiers

| Fichier | Role |
|---------|------|
| `src/pages/admin/Tasks.tsx` | Page principale avec bascule Liste/Kanban |
| `src/components/tasks/TaskList.tsx` | Vue liste (tableau) |
| `src/components/tasks/TaskKanban.tsx` | Vue Kanban (3 colonnes) |
| `src/components/tasks/TaskCard.tsx` | Carte individuelle pour le Kanban |
| `src/components/tasks/TaskDialog.tsx` | Dialogue creation/edition |
| `src/components/tasks/TaskFilters.tsx` | Barre de filtres |
| `src/components/tasks/TaskNotificationBadge.tsx` | Badge sidebar |
| `src/components/tasks/TaskRelatedLinks.tsx` | Affichage des liens CRM dans la carte |
| `src/hooks/useTasks.ts` | Hook CRUD + filtres |
| `src/hooks/useTaskNotifications.ts` | Hook notifications temps reel |
| `src/services/taskService.ts` | Service Supabase pour les taches |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| Sidebar/navigation | Ajout lien "Taches" avec badge |
| Routing | Ajout route `/admin/tasks` |

---

## 6. Suggestions d'amelioration

1. **Sous-taches** : Permettre de decomposer une tache en sous-taches avec checklist integree
2. **Rappels automatiques** : Cron job quotidien qui envoie un email pour les taches arrivant a echeance dans 24h ou en retard
3. **Modeles de taches** : Creer des templates de taches recurrentes (ex: "Verifier documents client", "Relance contrat") pour les appliquer en un clic
4. **Vue calendrier** : Ajouter une vue calendrier (en plus de Liste et Kanban) pour visualiser les echeances
5. **Mentions dans les commentaires** : Permettre de mentionner un collegue (@nom) dans un commentaire de tache pour le notifier directement
6. **Tags/etiquettes** : Systeme de tags personnalisables pour categoriser les taches (ex: "urgent-client", "admin", "comptabilite")
7. **Recurrence** : Taches recurrentes automatiques (journalier, hebdomadaire, mensuel)

---

## 7. Phases de livraison

**Phase 1 (ce plan)** :
- Tables + RLS
- Page Taches avec vues Liste et Kanban
- CRUD complet (creer, editer, supprimer, changer statut)
- Assignation + liens CRM
- Notifications in-app temps reel + badge sidebar
- Notification email a l'assignation

**Phase 2 (ulterieur)** :
- Commentaires sur les taches
- Rappels automatiques (cron)
- Encart "Taches liees" dans les pages client/contrat/offre
- Sous-taches, tags, recurrence
