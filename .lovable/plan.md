

## Plan : Filtrer les produits sans variantes sélectionnées dans l'API catalogue

### Problème

Dans l'éditeur d'options partenaire, `allowed_product_ids` stocke des **variant price IDs** (UUIDs de `product_variant_prices`), pas des product IDs. Mais l'API catalogue (`catalog-api/index.ts` lignes 1394-1403) fait un `.in('id', opt.allowed_product_ids)` sur la table `products`, ce qui ne filtre pas correctement. Résultat : des produits avec 0 variantes sélectionnées apparaissent quand même côté public.

### Solution

Modifier la logique de fetch des `allowed_products` dans `catalog-api/index.ts` (lignes 1388-1410) :

**Fichier : `supabase/functions/catalog-api/index.ts`**

Remplacer le bloc de fetch des produits autorisés par :

1. **Identifier les variant price IDs** : Requêter `product_variant_prices` avec `.in('id', allowed_product_ids)` pour obtenir les `product_id` parents et les IDs de variantes sélectionnées
2. **Identifier les product IDs directs** : Les IDs restants (non trouvés dans `product_variant_prices`) sont des product IDs de produits simples (sans variantes)
3. **Fetch des produits** : Requêter `products` avec l'union des deux ensembles de product IDs
4. **Filtrer les variantes** : Pour chaque produit retourné, ne garder dans `product_variant_prices` que les variantes dont l'ID est dans `allowed_product_ids`
5. **Exclure les produits vides** : Si un produit a des variantes mais qu'aucune n'est dans la liste autorisée → ne pas l'inclure

```text
allowed_product_ids: [vprice_A, vprice_B, product_C]
                          │           │          │
                          ▼           ▼          ▼
              product_variant_prices lookup   direct product
              → parent product_id: X          → product_id: C
                          │
                          ▼
              Fetch products X, C
              Filter X.variant_prices to [A, B] only
              Product C has no variants → include as-is
```

### Résultat

Seuls les produits ayant au moins une variante sélectionnée (ou les produits simples directement sélectionnés) apparaissent dans les choix sur le site public. Un produit avec "0/3" sélectionné ne sera plus visible.

