

## Plan : Rendre les lignes du tableau clients cliquables dans ClientList.tsx

### Problème
Le composant `ClientList.tsx` (utilisé sur la page `/admin/clients`) ne met pas de `onClick` sur les `TableRow` (ligne 257). Le clic sur la ligne ne déclenche donc aucune navigation. Seuls les boutons du menu Actions fonctionnent.

### Correction dans `src/components/clients/ClientList.tsx`

1. **Ajouter `onClick` et `cursor-pointer`** sur le `TableRow` (ligne 257) :
   ```tsx
   <TableRow 
     key={client.id} 
     className="hover:bg-gray-50 cursor-pointer"
     onClick={() => handleViewClient(client)}
   >
   ```

2. **Ajouter `e.stopPropagation()`** sur la cellule Actions (ligne 309) pour éviter que le clic sur le menu ne déclenche la navigation :
   ```tsx
   <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
   ```

### Fichier modifié
| Fichier | Action |
|---------|--------|
| `src/components/clients/ClientList.tsx` | Ajouter onClick sur TableRow + stopPropagation sur la cellule Actions |

