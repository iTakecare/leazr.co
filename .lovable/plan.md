

## Rendre les lignes cliquables dans AmbassadorClientsList

### Changement
Même pattern que `ClientTableRow` : ajouter `onClick` et `cursor-pointer hover:bg-muted/50` sur le `<TableRow>` pour ouvrir le dialog de détail au clic. Ajouter `stopPropagation` sur la cellule Actions.

### Fichier modifié
**`src/components/ambassador/AmbassadorClientsList.tsx`**

- Ligne 161 : `<TableRow key={client.id}>` → `<TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewClient(client)}>`
- Ligne 167 : `<TableCell className="text-right">` → `<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>`

