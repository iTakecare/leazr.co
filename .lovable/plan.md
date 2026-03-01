

# Lier les categories et marques du stock au catalogue existant

## Contexte

Actuellement, les champs `category` et `brand` de `stock_items` sont du texte libre. Or, le catalogue dispose deja de tables `categories` (avec id, name, translation) et `brands` (avec id, name) qui contiennent les valeurs de reference. Il faut utiliser ces tables pour alimenter les selects du formulaire stock et faire correspondre les valeurs lors de l'import Excel.

## Etape 1 : Formulaire StockItemForm.tsx

Remplacer les champs texte libres "Categorie" et "Marque" par des **Select** alimentes depuis les tables du catalogue :

- **Categorie** : charger les categories via `useCategories()` (hook existant dans `src/hooks/products/useCategories.ts`). Afficher `translation` comme label dans le select, stocker `name` comme valeur dans `stock_items.category` (pour rester compatible avec le champ texte existant et les groupements du rapport de valorisation).
- **Marque** : charger les marques via `useBrands()` (hook existant dans `src/hooks/products/useBrands.ts`). Afficher `name` comme label, stocker `name` comme valeur dans `stock_items.brand`.
- Garder une option "Autre" qui permet la saisie libre en cas de valeur absente du catalogue.

### Modifications dans `StockItemForm.tsx`
- Importer `useCategories` et `useBrands`
- Remplacer le `<Input>` categorie (ligne 193-194) par un `<Select>` avec les categories du catalogue + option "Autre"
- Remplacer le `<Input>` marque (ligne 197-198) par un `<Select>` avec les marques du catalogue + option "Autre"

## Etape 2 : Import Excel (stockImportService.ts)

Lors de l'import, faire correspondre les valeurs texte importees avec les tables existantes :

- Apres le parsing, normaliser la categorie importee et la comparer aux `categories.name` et `categories.translation` existantes. Si match, utiliser le `name` de la categorie. Sinon, garder la valeur telle quelle.
- Meme logique pour la marque : normaliser et comparer aux `brands.name`. Si match, utiliser le nom exact de la marque.

### Modifications dans `stockImportService.ts`
- Dans `importStockFromExcel`, charger les categories et brands depuis Supabase en debut d'import
- Creer des maps de normalisation (comme pour les fournisseurs)
- Appliquer la correspondance lors de la construction de `itemData`

## Etape 3 : Liste StockItemList.tsx

Pas de changement structurel necessaire -- les colonnes affichent deja les valeurs texte `category` et `brand`. Aucune modification requise.

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/stock/StockItemForm.tsx` | Remplacer Input par Select pour categorie et marque, avec donnees du catalogue |
| `src/services/stockImportService.ts` | Matcher les valeurs importees avec les categories et marques existantes |

## Details techniques

- Les hooks `useCategories` et `useBrands` sont deja disponibles et caches via React Query
- On stocke le `name` (pas l'id) dans `stock_items.category` et `stock_items.brand` pour rester compatible avec le rapport de valorisation qui groupe par ces valeurs texte
- L'option "Autre" dans les selects bascule vers un champ texte libre pour ne pas bloquer l'utilisateur si une valeur n'existe pas encore dans le catalogue

