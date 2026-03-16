

# Problème : Les demandes client n'ont pas de prix d'achat

## Diagnostic

En analysant le flux complet, voici la chaîne de problèmes :

### 1. **`createClientRequest` ne passe pas `product_id` ni `image_url` aux équipements**
Le code dans `clientRequests.ts` (ligne 127-135) construit l'objet `equipment` sans `product_id` ni `image_url`, contrairement au flux public (edge function) qui les inclut. Cela empêche le lien entre l'équipement et le produit catalogue.

### 2. **Le prix d'achat dépend de `variant_combination_prices` dans le produit**
La fonction `getProductPrice` cherche le `price` (= prix d'achat) dans `product.variant_combination_prices`. Or, après sérialisation/désérialisation localStorage du panier, ces données sont présentes mais la correspondance des clés `selectedOptions` peut échouer (clés internes comme `variant_id`, `selected_variant_id` polluent la comparaison dans `Object.entries(selectedOptions).every(...)`).

### 3. **Pas de `selling_price` ni de `coefficient` par équipement**
L'objet equipment ne transmet ni `selling_price` ni `coefficient`, ce qui donne des colonnes P.V. et Marge à 0 dans l'admin.

## Plan de correction

### Étape 1 : Nettoyer les `selectedOptions` avant la recherche de prix
**Fichier : `src/utils/productPricing.ts`**
- Filtrer les clés internes (`variant_id`, `selected_variant_id`) des `selectedOptions` avant de faire la comparaison avec `variant_combination_prices.attributes`. Ces clés ne sont pas des attributs produit et cassent le matching.

### Étape 2 : Enrichir l'équipement avec `product_id`, `image_url`, `selling_price`
**Fichier : `src/services/offers/clientRequests.ts`**
- Ajouter `product_id: item.product.id` dans l'objet equipment.
- Ajouter `image_url: item.product.image_url` pour l'affichage dans l'admin.
- Calculer et passer `selling_price` (= prix de vente unitaire = purchase_price + margin).
- Passer le `coefficient` calculé.

### Étape 3 : S'assurer que `getProductPrice` utilise aussi `purchase_price` du variant combo
**Fichier : `src/utils/productPricing.ts`**
- En plus de `combo.price`, vérifier `combo.purchase_price` (le champ existe en DB mais n'est pas peuplé actuellement — il faut quand même le supporter pour le futur).
- Les données actuelles stockent le prix d'achat dans `combo.price` (confirmé en DB : `price: 900`, `purchase_price: nil`). Ce mapping est déjà correct.

### Étape 4 : Aligner le flux client avec le flux public pour la complétude
**Fichier : `src/components/checkout/ClientRequestSummary.tsx`**
- S'assurer que `cartItemsWithPricing` passe les bonnes données au service, en nettoyant les `selectedOptions` des clés internes.

### Résumé des fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/utils/productPricing.ts` | Filtrer `variant_id`/`selected_variant_id` des options avant matching |
| `src/services/offers/clientRequests.ts` | Ajouter `product_id`, `image_url`, `selling_price`, `coefficient` à l'equipment |
| `src/components/checkout/ClientRequestSummary.tsx` | Nettoyer les `selectedOptions` avant passage au service |

