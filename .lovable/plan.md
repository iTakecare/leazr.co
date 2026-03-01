
# Rapport de valorisation du stock

## Objectif

Ajouter un nouvel onglet "Valorisation" dans la page de gestion du stock qui presente un rapport de la valeur totale du stock, ventile par categorie de produit et par statut.

## Nouveau composant

### `src/components/stock/StockValuationReport.tsx`

Composant qui :
- Charge tous les `stock_items` de la company via le hook `useStockItems()`
- Calcule cote client (pas de nouvelle requete DB) les agregations suivantes :
  - **Valeur totale** : somme de tous les `purchase_price`
  - **Par statut** : pour chaque statut (en stock, attribue, en reparation, commande, vendu, rebut), la quantite et la valeur totale
  - **Par categorie** : regroupement par le champ `product.name` (ou "Sans categorie" si null), avec quantite et valeur totale
- Affiche le rapport en 3 sections :

#### Section 1 : Carte resume
- Valeur totale du stock actif (exclut vendu/rebut)
- Nombre total d'articles actifs
- Valeur moyenne par article

#### Section 2 : Tableau par statut
Table avec colonnes : Statut | Quantite | Valeur totale | % du total
Avec badge de couleur pour chaque statut (reutilisation de `STOCK_STATUS_CONFIG`)

#### Section 3 : Tableau par categorie de produit
Table avec colonnes : Categorie | Quantite | Valeur totale | % du total
Triee par valeur decroissante

Le composant utilise les utilitaires `formatCurrency` existants pour formater les montants.

## Modification existante

### `src/pages/admin/StockManagement.tsx`

- Importer `StockValuationReport`
- Ajouter un onglet "Valorisation" dans le `TabsList` existant (apres "Reparations")
- Ajouter le `TabsContent` correspondant

## Aucun autre fichier modifie

Pas de nouveau service, pas de modification de base de donnees, pas de nouveau hook. Le composant reutilise le hook `useStockItems()` existant et fait les calculs cote client.

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/stock/StockValuationReport.tsx` | Creer |
| `src/pages/admin/StockManagement.tsx` | Modifier - ajouter onglet Valorisation |
