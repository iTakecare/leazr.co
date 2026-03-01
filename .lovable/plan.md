

# Ajout de la gestion des quantites et du prix d'achat unitaire

## Contexte

Actuellement, chaque `stock_item` n'a qu'un champ `purchase_price` qui represente un montant global. Il manque deux informations essentielles :
- **Quantite** (`quantity`) : combien d'unites de cet article
- **Prix d'achat unitaire** (`unit_price`) : le prix par unite

Le `purchase_price` existant deviendra le prix total calcule (quantite x prix unitaire).

## Etape 1 : Migration SQL

Ajouter deux colonnes a la table `stock_items` :

| Champ | Type | Default | Description |
|---|---|---|---|
| `quantity` | integer | 1 | Nombre d'unites |
| `unit_price` | numeric | 0 | Prix d'achat unitaire HT |

Migration :
```sql
ALTER TABLE stock_items ADD COLUMN quantity integer DEFAULT 1 NOT NULL;
ALTER TABLE stock_items ADD COLUMN unit_price numeric DEFAULT 0;
-- Initialiser unit_price depuis purchase_price pour les donnees existantes
UPDATE stock_items SET unit_price = COALESCE(purchase_price, 0), quantity = 1 WHERE unit_price = 0 OR unit_price IS NULL;
```

## Etape 2 : Mise a jour du service stock (`stockService.ts`)

- Ajouter `quantity` et `unit_price` a l'interface `StockItem`
- Le `purchase_price` reste en base mais represente le total (quantity * unit_price)

## Etape 3 : Mise a jour du formulaire (`StockItemForm.tsx`)

- Ajouter un champ **Quantite** (input number, min 1, default 1)
- Renommer le champ prix actuel en **Prix unitaire HT**
- Afficher le **Prix total** calcule automatiquement (quantite x prix unitaire) en lecture seule
- Lors de la soumission, envoyer `quantity`, `unit_price` et `purchase_price = quantity * unit_price`

## Etape 4 : Mise a jour de la liste (`StockItemList.tsx`)

- Ajouter une colonne **Qte** apres le modele
- Renommer la colonne "Prix achat" en "Prix unitaire"
- Ajouter une colonne **Total** (quantite x prix unitaire)

## Etape 5 : Mise a jour du rapport de valorisation (`StockValuationReport.tsx`)

- Les calculs de valeur utilisent deja `purchase_price` qui reste le total, donc pas de changement de logique majeur
- Ajouter l'affichage de la quantite totale dans les tableaux de regroupement

## Etape 6 : Mise a jour de l'import Excel (`stockImportService.ts`)

- Ajouter les champs `quantity` et `unit_price` au `StockImportRow`
- Ajouter les patterns de detection : "quantite", "qty", "qte", "nombre" pour quantity et "prixunitaire", "unitprice", "pu" pour unit_price
- Lors de l'import, calculer `purchase_price = quantity * unit_price`

## Resume des fichiers

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonnes `quantity` et `unit_price` |
| `src/services/stockService.ts` | Ajouter champs a l'interface StockItem |
| `src/components/stock/StockItemForm.tsx` | Champs quantite + prix unitaire + total calcule |
| `src/components/stock/StockItemList.tsx` | Colonnes Qte, Prix unitaire, Total |
| `src/components/stock/StockValuationReport.tsx` | Quantites totales dans les regroupements |
| `src/services/stockImportService.ts` | Mapping quantite et prix unitaire |
