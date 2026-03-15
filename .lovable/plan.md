

## Menu Support — Page dédiée avec onglets

### Architecture

Nouvelle page **Support** accessible depuis la sidebar admin (entre Tâches et Paramètres), avec 4 onglets :

1. **Formulaire de contact** — Liste des soumissions du formulaire du site web
2. **Tickets de support** — Gestion des tickets clients
3. **Boîte mail** — Lecture des emails via IMAP avec possibilité de lier à un ticket/tâche
4. **Configuration IMAP** — Paramètres IMAP par utilisateur (dans les paramètres ou dans cet onglet)

### Base de données (3 migrations)

**Table `contact_submissions`** — Stocker les soumissions du formulaire de contact :
- `id`, `company_id`, `name`, `email`, `phone`, `company_name`, `subject`, `message`, `status` (new/read/replied/archived), `created_at`, `replied_at`
- RLS : lecture/mise à jour par les membres de la company

**Table `support_tickets`** — Tickets de support :
- `id`, `company_id`, `client_id` (nullable, ref clients), `contact_submission_id` (nullable), `email_id` (nullable), `subject`, `description`, `status` (open/in_progress/resolved/closed), `priority` (low/medium/high/urgent), `assigned_to` (uuid), `created_by`, `created_at`, `updated_at`
- RLS : isolation par company_id

**Table `user_imap_settings`** — Configuration IMAP par utilisateur :
- `id`, `user_id` (ref auth.users), `company_id`, `imap_host`, `imap_port`, `imap_username`, `imap_password_encrypted`, `imap_use_ssl`, `folder` (default INBOX), `is_active`, `last_sync_at`, `created_at`
- RLS : l'utilisateur ne voit que ses propres paramètres

**Table `synced_emails`** — Emails récupérés via IMAP :
- `id`, `company_id`, `user_id`, `message_id` (unique IMAP ID), `from_address`, `from_name`, `to_address`, `subject`, `body_text`, `body_html`, `received_at`, `is_read`, `linked_ticket_id` (nullable), `linked_task_id` (nullable), `created_at`
- RLS : isolation par user_id + company_id

### Edge Function `sync-imap-emails`

- Récupère les paramètres IMAP de l'utilisateur depuis `user_imap_settings`
- Se connecte au serveur IMAP via une lib Deno compatible
- Synchronise les nouveaux emails dans `synced_emails`
- Appelée manuellement (bouton "Synchroniser") ou via pg_cron

### Fichiers frontend à créer

| Fichier | Rôle |
|---------|------|
| `src/pages/admin/SupportPage.tsx` | Page principale avec les 4 onglets |
| `src/components/support/ContactSubmissionsList.tsx` | Tableau des soumissions du formulaire |
| `src/components/support/SupportTicketsList.tsx` | Tableau des tickets avec filtres et statuts |
| `src/components/support/SupportTicketDetail.tsx` | Vue détaillée d'un ticket |
| `src/components/support/EmailInbox.tsx` | Boîte mail avec liste des emails synchronisés |
| `src/components/support/EmailDetail.tsx` | Détail d'un email avec actions (lier à ticket/tâche) |
| `src/components/support/ImapSettingsForm.tsx` | Formulaire de configuration IMAP |

### Modifications existantes

- **`src/components/layout/Sidebar.tsx`** — Ajouter l'entrée "Support" (icône `Headset`) entre Tâches et Paramètres, href `${basePrefix}/admin/support`, moduleSlug `"support"`, alwaysVisible: true
- **`src/App.tsx`** — Ajouter la route `support` dans les admin routes
- **`src/pages/ContactPage.tsx`** — Modifier le `handleSubmit` pour insérer dans `contact_submissions` au lieu du console.log actuel
- **`src/components/mobile/pages/MobileSettingsPage.tsx`** — Pas de changement immédiat (le support sera accessible via la sidebar mobile)

### Fonctionnalités clés

- **Formulaire de contact** : Le formulaire public existant écrira dans `contact_submissions`. L'admin verra la liste avec statut, pourra marquer comme lu/répondu, et convertir en ticket.
- **Tickets** : Création manuelle ou depuis un email/formulaire. Assignation, priorité, statut. Lien optionnel vers un client existant.
- **Boîte mail** : Affichage des emails synchronisés. Depuis un email, possibilité de créer un ticket ou une tâche en un clic.
- **IMAP** : Chaque utilisateur configure ses propres identifiants IMAP. Le mot de passe sera chiffré côté Edge Function avant stockage (pgcrypto).

