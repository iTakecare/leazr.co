

# Import du stock depuis Excel et ajout des champs manquants

## Contexte

Le fichier `stock_itc.xlsx` contient un inventaire complet a importer. Comme le fichier ne peut pas etre lu directement (format binaire), une fonctionnalite d'import Excel sera creee pour parser le fichier cote client avec ExcelJS (deja installe dans le projet), detecter automatiquement les colonnes et les mapper vers la table `stock_items`.

## Etape 1 : Ajouter les colonnes manquantes a la table `stock_items`

La table actuelle manque de champs importants pour une gestion de stock complete. Migration SQL pour ajouter :

| Nouveau champ | Type | Description |
|---|---|---|
| `category` | text | Categorie de l'article (ex: PC portable, Ecran, Accessoire) |
| `brand` | text | Marque (ex: Dell, HP, Lenovo) |
| `model` | text | Modele precis de l'article |
| `warranty_end_date` | date | Date de fin de garantie |

Ces champs sont independants de `product_id` pour permettre l'import de stock sans catalogue produit pre-existant.

## Etape 2 : Creer le service d'import stock

### `src/services/stockImportService.ts`

Service qui :
- Parse le fichier Excel avec ExcelJS (meme pattern que `excelImportService.ts`)
- Detection automatique des colonnes via normalisation des en-tetes (sans accents, minuscules)
- Mapping flexible des colonnes Excel vers les champs stock_items :

```text
Colonnes possibles -> Champ stock_items
---------------------------------------------
Titre/Description/Nom   -> title
N serie/Serial          -> serial_number
Categorie/Type          -> category
Marque/Brand            -> brand
Modele/Model            -> model
Fournisseur/Supplier    -> supplier (lookup par nom)
Prix achat/Purchase     -> purchase_price
Statut/Status           -> status (mapping vers enum)
Etat/Condition          -> condition (mapping vers enum)
Emplacement/Location    -> location
Date achat              -> purchase_date
Date reception          -> reception_date
Garantie fin/Warranty   -> warranty_end_date
Ref commande            -> order_reference
Notes/Remarques         -> notes
```

- Pour les fournisseurs : recherche par nom dans la table `suppliers`, creation automatique si non trouve
- Pour les statuts : mapping des valeurs francaises vers les enums internes (ex: "En stock" -> `in_stock`)
- Retourne un rapport d'import (succes, erreurs, doublons par numero de serie)

## Etape 3 : Creer le composant d'import

### `src/components/stock/StockImportDialog.tsx`

Dialog modal avec 3 etapes :
1. **Upload** : zone de drop (react-dropzone deja installe) pour deposer le fichier Excel
2. **Preview** : affiche les N premieres lignes detectees avec le mapping des colonnes, permet de corriger
3. **Import** : barre de progression, rapport final (X importes, Y erreurs, Z doublons)

## Etape 4 : Integrer dans StockManagement

### `src/pages/admin/StockManagement.tsx`

- Ajouter un bouton "Importer Excel" a cote du bouton "Nouvel article" existant (icone `Upload`)
- Ouvrir le `StockImportDialog`

## Etape 5 : Mettre a jour l'interface et le service stock

### `src/services/stockService.ts`
- Ajouter les nouveaux champs (`category`, `brand`, `model`, `warranty_end_date`) a l'interface `StockItem`

### `src/components/stock/StockItemList.tsx`
- Ajouter les colonnes Categorie, Marque, Modele dans le tableau

### `src/components/stock/StockItemForm.tsx`
- Ajouter les champs Categorie, Marque, Modele, Date fin garantie dans le formulaire de creation manuelle

### `src/components/stock/StockValuationReport.tsx`
- Permettre aussi le regroupement par marque dans le rapport de valorisation

## Resume des fichiers

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonnes `category`, `brand`, `model`, `warranty_end_date` |
| `src/services/stockImportService.ts` | Creer - service de parsing et import Excel |
| `src/components/stock/StockImportDialog.tsx` | Creer - dialog d'import avec preview |
| `src/pages/admin/StockManagement.tsx` | Modifier - bouton "Importer Excel" |
| `src/services/stockService.ts` | Modifier - ajouter champs a l'interface StockItem |
| `src/components/stock/StockItemList.tsx` | Modifier - colonnes supplementaires |
| `src/components/stock/StockItemForm.tsx` | Modifier - champs supplementaires |
| `src/components/stock/StockValuationReport.tsx` | Modifier - regroupement par marque |

## Workflow utilisateur

1. Cliquer sur "Importer Excel" dans la page Stock
2. Deposer le fichier `stock_itc.xlsx`
3. Le systeme parse et affiche un apercu avec les colonnes detectees
4. Confirmer l'import
5. Les articles sont crees dans `stock_items` avec un mouvement de reception automatique
6. Le dashboard et la liste se rafraichissent automatiquement

