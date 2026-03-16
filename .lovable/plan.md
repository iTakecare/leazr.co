

## Notifications sidebar pour les réponses aux tickets + fix email

### Problèmes identifiés

1. **Pas de notification sidebar** : Ni côté admin ni côté client, il n'y a de badge sur l'item "Support" dans la sidebar pour signaler de nouvelles réponses aux tickets.
2. **Email non envoyé** : L'Edge Function `notify-ticket-reply` a `verify_jwt = true` dans `config.toml`, ce qui bloque l'appel depuis le frontend (le token JWT de l'utilisateur est passé mais la fonction attend une auth stricte). De plus, la requête fait une jointure `clients(name, email)` et `companies(name)` — si la relation FK ou le RLS empêche l'accès, l'email ne part pas.

### Plan

#### 1. Créer un hook `useTicketReplyNotifications`
Nouveau fichier `src/hooks/useTicketReplyNotifications.ts` :
- Accepte un paramètre `role: 'admin' | 'client'` et l'ID pertinent (companyId ou clientId)
- **Admin** : compte les `ticket_replies` avec `sender_type = 'client'` non lues (on ajoutera un champ `is_read_by_admin` à `ticket_replies`)
- **Client** : compte les `ticket_replies` avec `sender_type = 'admin'` non lues (`is_read_by_admin` → `is_read_by_client`)
- Souscrit en temps réel aux INSERT sur `ticket_replies` pour mettre à jour le compteur
- Expose `unreadCount` et `markRepliesAsRead(ticketId)`

#### 2. Migration SQL : ajouter colonnes de lecture
```sql
ALTER TABLE ticket_replies ADD COLUMN is_read_by_admin boolean DEFAULT false;
ALTER TABLE ticket_replies ADD COLUMN is_read_by_client boolean DEFAULT false;
-- Les réponses admin sont auto-lues par admin, client par client
UPDATE ticket_replies SET is_read_by_admin = true WHERE sender_type = 'admin';
UPDATE ticket_replies SET is_read_by_client = true WHERE sender_type = 'client';
```

#### 3. Sidebar Admin (`Sidebar.tsx`)
- Importer `useTicketReplyNotifications` avec `role: 'admin'`
- Ajouter le `badge` sur l'item Support (comme c'est déjà fait pour "Tâches")

#### 4. Sidebar Client (`ClientSidebar.tsx`)
- Importer `useTicketReplyNotifications` avec `role: 'client'`
- Ajouter le `badge` sur l'item Support

#### 5. Marquer comme lu
- Dans `SupportTicketDetail.tsx` (admin) : quand on ouvre un ticket, appeler `markRepliesAsRead(ticketId)` qui met `is_read_by_admin = true` sur toutes les réponses client de ce ticket
- Dans `ClientSupportPage.tsx` (client) : même chose avec `is_read_by_client = true`

#### 6. Fix email — Edge Function `notify-ticket-reply`
- Changer `verify_jwt = true` → `verify_jwt = false` dans `config.toml`
- Dans la fonction, utiliser `SUPABASE_SERVICE_ROLE_KEY` (déjà fait) pour la requête DB
- Redéployer la fonction

### Fichiers impactés
- `supabase/migrations/new.sql` — colonnes `is_read_by_admin/client`
- `src/hooks/useTicketReplyNotifications.ts` — nouveau hook
- `src/components/layout/Sidebar.tsx` — badge Support admin
- `src/components/layout/ClientSidebar.tsx` — badge Support client
- `src/components/support/SupportTicketDetail.tsx` — marquer lu admin
- `src/pages/ClientSupportPage.tsx` — marquer lu client
- `supabase/config.toml` — `verify_jwt = false` pour notify-ticket-reply

