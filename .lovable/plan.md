

# Ajouter la colonne "Montant financé" au tableau des contrats

## Modification

**Fichier** : `src/components/contracts/ContractsTable.tsx`

1. Ajouter `'financed_amount'` au type `SortColumn`
2. Ajouter le cas `financed_amount` dans le `useMemo` de tri (comparaison numérique)
3. Ajouter un `SortableTableHead` pour "Montant financé" entre "Mensualité" et "Date début" (avec `className="text-right"`)
4. Ajouter une `TableCell` correspondante affichant `formatCurrency(contract.financed_amount || 0)` avec `text-right`

Pas d'autre fichier à modifier — le champ `financed_amount` est déjà présent sur le type `Contract` et alimenté par les requêtes existantes.

