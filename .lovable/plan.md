

# Correction de la liste des fournisseurs dans le formulaire de stock

## Probleme identifie

Le composant `SupplierSelectOrCreate` utilise la bibliotheque `cmdk` pour la recherche et la selection. L'investigation montre que les deux pages (stock et commandes) utilisent exactement la meme fonction `fetchSuppliers(companyId)` pour charger les fournisseurs. La difference est que la page des commandes utilise un simple `Select` natif qui affiche tous les fournisseurs sans probleme, tandis que le formulaire de stock utilise `cmdk` qui peut filtrer/masquer certains elements de maniere inattendue.

Deux corrections a apporter :

1. **Ajout de `shouldFilter={false}` sur le composant `Command`** dans `SupplierSelectOrCreate.tsx` pour eviter le filtrage automatique de cmdk qui peut masquer des resultats. Le filtrage sera gere manuellement sur le texte de recherche saisi.

2. **Ajout d'un log de debug** temporaire pour verifier que tous les fournisseurs sont bien charges (sera retire apres validation).

## Note secondaire

Un fournisseur dans la base de donnees a le nom `[object Object]` (c'est le bug `[object Object]` visible dans la capture d'ecran precedente). Ce n'est pas un bug de code mais une donnee corrompue en base.

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/components/equipment/SupplierSelectOrCreate.tsx` | Desactiver le filtrage automatique de cmdk, implementer un filtrage manuel sur le champ de recherche |

## Detail technique

1. Ajouter un state `searchQuery` pour capturer le texte de recherche
2. Ajouter `shouldFilter={false}` au composant `Command` pour desactiver le filtrage cmdk
3. Filtrer manuellement la liste des fournisseurs avec `suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))`
4. Passer `onValueChange` au `CommandInput` pour capturer le texte de recherche
5. Le bouton "Nouveau fournisseur" reste toujours visible en dehors du `CommandList`

Cela aligne le comportement avec la recommandation technique existante du projet (memoire `cmdk-server-side-filtering`) et garantit que tous les fournisseurs sont toujours visibles dans la liste.
