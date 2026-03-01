
# Correction du bouton "Nouveau fournisseur" dans le formulaire de stock

## Probleme identifie
Le composant `SupplierSelectOrCreate` est bien integre dans le formulaire de stock, mais le bouton "Nouveau fournisseur" en bas de la liste deroulante est **filtre par la recherche** du composant `cmdk`. Quand on tape du texte pour chercher un fournisseur, l'option "Nouveau fournisseur" disparait car elle ne correspond pas au texte saisi. De plus, avec beaucoup de fournisseurs, il faut scroller jusqu'en bas pour la voir.

## Probleme secondaire
Dans le tableau de la liste de stock, certains fournisseurs s'affichent comme `[object Object]` -- cela sera aussi corrige.

## Modifications

| Fichier | Changement |
|---|---|
| `src/components/equipment/SupplierSelectOrCreate.tsx` | Rendre le bouton "Nouveau fournisseur" toujours visible en dehors de la zone filtrable |

## Detail technique

### 1. Bouton "Nouveau fournisseur" toujours visible
Deplacer le bouton "Nouveau fournisseur" **en dehors** du `CommandList` pour qu'il ne soit jamais filtre par la recherche et reste toujours visible en bas de la liste :

```text
Command
  CommandInput (recherche)
  CommandList (zone scrollable et filtrable)
    CommandEmpty
    CommandGroup (liste des fournisseurs)
  -- en dehors du CommandList --
  Separator
  Button "Nouveau fournisseur" (toujours visible, non filtrable)
```

Le bouton sera un simple `div` avec un `onClick` au lieu d'un `CommandItem`, place apres la fermeture de `CommandList`, avec le meme style visuel.

### 2. Correction [object Object] dans le tableau (si necessaire)
Verifier que le champ `supplier` dans `StockItemList` affiche bien `item.supplier?.name` et non l'objet entier. Le code actuel semble correct (`item.supplier?.name || '-'`), donc le probleme vient probablement de donnees existantes en base ou certains articles ont ete importes avec le fournisseur stocke comme objet serialise. Aucune modification de code necessaire pour ce point -- c'est un probleme de donnees.
