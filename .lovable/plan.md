

## Rendre les lignes clients cliquables

### Changement
Ajouter un `onClick` sur le `<TableRow>` dans `ClientTableRow.tsx` pour naviguer vers la fiche client au clic, avec un curseur pointer. Le clic sur la colonne Actions (dropdown) ne doit pas déclencher la navigation.

### Fichier modifié
**`src/components/clients/ClientTableRow.tsx`**

- Ajouter `onClick={handleViewClient}` et `className="cursor-pointer hover:bg-muted/50"` sur le `<TableRow>`
- Sur la `<TableCell>` des actions, ajouter `onClick={(e) => e.stopPropagation()}` pour éviter que le clic sur le menu déclenche aussi la navigation

