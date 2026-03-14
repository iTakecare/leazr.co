

## Plan : Mettre à jour la documentation API

### Changements

**1. `public/catalog-api-documentation.txt`**

- Ajouter une note dans la section "STRUCTURE D'UNE OPTION" (vers ligne 500) expliquant que `allowed_product_ids` contient des **variant price IDs** (pas des product IDs) et que l'API filtre automatiquement les produits pour n'inclure que ceux ayant au moins une variante sélectionnée
- Ajouter une entrée dans l'historique des versions (ligne ~986) :
  - `✅ Filtrage intelligent : seuls les produits avec variantes sélectionnées sont retournés dans allowed_products`
  - `✅ allowed_product_ids accepte des variant price IDs (UUIDs de product_variant_prices)`

**2. `catalog-skeleton/partners-api.txt`**

- Ajouter dans la section "Notes" (ligne 270) :
  - `allowed_product_ids` contient des **variant price IDs** (UUIDs de `product_variant_prices`), pas des product IDs directs
  - L'API filtre automatiquement : un produit n'apparaît dans `allowed_products` que s'il a au moins une variante sélectionnée
  - Les `product_variant_prices` retournés sont limités aux seules variantes présentes dans `allowed_product_ids`

