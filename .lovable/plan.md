

# Correction du scroll de la liste fournisseurs dans le formulaire de stock

## Probleme

Le composant `SupplierSelectOrCreate` est utilise a l'identique dans les commandes et dans le stock. Dans les commandes, la liste deroulante des fournisseurs permet de scroller normalement. Dans le stock, le meme composant est rendu a l'interieur d'un `Dialog` avec `overflow-y-auto` (ligne 235 de `StockItemForm.tsx`), ce qui interfere avec le scroll du `PopoverContent` : les evenements de scroll "remontent" au dialog parent au lieu de rester dans la liste.

## Solution

Ajouter un gestionnaire `onWheel` avec `stopPropagation` sur le `CommandList` du composant `SupplierSelectOrCreate` pour empecher le dialog parent de capturer les evenements de scroll destines a la liste des fournisseurs.

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/components/equipment/SupplierSelectOrCreate.tsx` | Ajouter `onWheel={(e) => e.stopPropagation()}` sur le `CommandList` pour isoler le scroll de la liste |

## Detail technique

Dans `SupplierSelectOrCreate.tsx`, ligne 109, modifier le `CommandList` :

```text
Avant:  <CommandList>
Apres:  <CommandList onWheel={(e) => e.stopPropagation()}>
```

Cela empeche l'evenement de scroll de remonter au `DialogContent` parent et permet de scroller normalement dans la liste des fournisseurs, que le composant soit utilise dans un dialog ou non.

