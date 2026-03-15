

## Plan : Ajouter un bouton supprimer dans la liste des tickets

### Problème
La suppression ne fonctionne que depuis la vue détail, et le ticket reste affiché dans la liste. Il faut ajouter une icône de suppression directement dans chaque ligne du tableau.

### Changements dans `src/components/support/SupportTicketsList.tsx`

1. **Ajouter une colonne "Actions"** dans le `TableHeader` (après Statut)
2. **Ajouter un bouton Trash2** dans chaque `TableRow` avec `onClick` qui stoppe la propagation et ouvre une confirmation
3. **Ajouter un état `ticketToDelete`** + un `AlertDialog` de confirmation (comme dans `SupportTicketDetail`)
4. **Ajouter une mutation `deleteTicket`** qui supprime le ticket et invalide le cache
5. **Imports** : `Trash2` de lucide-react, `AlertDialog` components

Cela permettra de supprimer directement depuis la liste sans avoir à ouvrir le détail.

