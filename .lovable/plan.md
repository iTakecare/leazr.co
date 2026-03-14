

## Plan : Corriger la suppression de produits (erreur de contrainte FK)

### Problème

La fonction `deleteProduct` dans `src/services/catalogService.ts` fait un simple `DELETE FROM products WHERE id = ...` sans supprimer les enregistrements dépendants (variantes, prix de combinaison, produits enfants, etc.), ce qui provoque une erreur de contrainte de clé étrangère.

### Solution

**Fichier : `src/services/catalogService.ts`** — Remplacer la fonction `deleteProduct` par une suppression en cascade manuelle qui supprime d'abord les enregistrements dépendants dans le bon ordre :

1. `product_variant_prices` (prix des combinaisons de variantes)
2. Produits enfants (`products WHERE parent_id = productId`)
3. Autres tables potentiellement liées (images, attributs, etc.)
4. Le produit parent lui-même

L'ordre exact des tables dépendantes sera vérifié via une requête SQL sur les contraintes FK avant implémentation.

### Vérification préalable

Exécuter une requête SQL pour identifier toutes les tables avec FK vers `products` afin de couvrir tous les cas.

