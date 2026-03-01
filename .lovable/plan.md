

# Modifications du tableau de stock

## Changements demandes

1. **Reduire la taille des typographies** : Ajouter `text-xs` sur toutes les cellules et en-tetes du tableau pour une apparence plus compacte
2. **Supprimer la colonne Contrat** : Retirer la colonne "Contrat" des en-tetes et de toutes les fonctions de rendu (renderRow, renderGroupParentRow)
3. **Ajouter la colonne Grade** : Nouvelle colonne triable affichant `item.grade` (le champ existe deja dans StockItem)
4. **Ajouter la colonne Notes** : Nouvelle colonne affichant `item.notes` avec troncature pour eviter de casser la mise en page

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/components/stock/StockItemList.tsx` | Modifier les en-tetes, renderRow, renderGroupParentRow |

## Detail technique

### Type SortKey (ligne 25)
Ajouter `'grade'` et `'notes'` au type union SortKey.

### getSortValue (ligne 49)
Ajouter les cas `grade` et `notes` retournant les valeurs en lowercase.

### tableHeaders (lignes 415-433)
- Supprimer `<TableHead>Contrat</TableHead>`
- Ajouter `<SortableHead column="grade">Grade</SortableHead>` apres la colonne Etat
- Ajouter `<SortableHead column="notes">Notes</SortableHead>` en derniere position
- Reduire la taille des en-tetes avec des classes plus compactes

### renderRow (lignes 358-413)
- Supprimer la cellule Contrat (lignes 404-406)
- Ajouter une cellule Grade apres Etat : `item.grade || '-'`
- Ajouter une cellule Notes en fin de ligne : `item.notes` tronque avec `truncate max-w-[150px]`
- S'assurer que toutes les cellules ont `text-xs`

### renderGroupParentRow (lignes 243-331)
- Meme modifications : supprimer Contrat, ajouter Grade et Notes (tirets pour la ligne parent)
- Ajuster le nombre de cellules placeholder pour les lignes enfant egalement
- Lignes enfant : afficher `item.grade` et `item.notes`

### Ordre des colonnes final
Actions | Article | N de serie | Categorie | Marque | Modele | Qte | Statut | Etat | Grade | Fournisseur | Prix unitaire | Total | Date | Notes

