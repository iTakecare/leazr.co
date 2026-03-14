
Objectif
Corriger le cas où un produit à variantes (ex: iPad Pro M2 11 pouces) apparaît encore côté public alors que 0 variante est sélectionnée dans l’option partenaire.

Constat (diagnostic)
- Le problème vient d’un mélange d’IDs dans `partner_pack_options.allowed_product_ids` :
  - IDs de variantes (`product_variant_prices.id`)
  - et anciens IDs de produits parents (`products.id`) pour des produits qui ont des variantes.
- Dans `supabase/functions/catalog-api/index.ts` (fonction `getPartnerPacks`), la logique actuelle inclut encore un produit à variantes si son `product.id` est présent dans `directProductIds`, même quand aucune variante n’est sélectionnée.
- Résultat: l’API renvoie le produit avec toutes ses variantes, donc l’UI l’affiche malgré “0/N”.

Plan de correction
1) Corriger le filtrage API (source principale du bug)
- Fichier: `supabase/functions/catalog-api/index.ts` (section `getPartnerPacks`).
- Modifier la règle d’inclusion:
  - Produit avec variantes: inclure uniquement si `filteredVariants.length > 0`.
  - Produit simple (sans variantes): inclure seulement si `product.id` est dans `directProductIds`.
- Supprimer le fallback qui inclut un produit à variantes juste parce que son `product.id` est présent.

2) Nettoyer la persistance côté admin pour éviter la réintroduction
- Fichier: `src/components/partners/PartnerPackOptionsEditor.tsx`.
- Ajouter une normalisation des `allowed_product_ids` au chargement d’édition et à la sauvegarde:
  - conserver les IDs de variantes,
  - conserver les IDs de produits simples,
  - retirer les IDs de produits parents ayant des variantes.
- Mettre à jour le compteur “X sélectionné(s)” pour refléter les IDs réellement valides.

3) (Option recommandé) Nettoyage one-shot des données existantes
- Exécuter une migration SQL qui retire des `allowed_product_ids` les `products.id` correspondant à des produits ayant des lignes dans `product_variant_prices`.
- But: supprimer l’héritage historique une fois pour toutes et aligner la base avec la nouvelle règle.

4) Mise à jour documentaire
- `public/catalog-api-documentation.txt` + `catalog-skeleton/partners-api.txt`:
  - préciser explicitement: pour les produits à variantes, seuls les `variant price IDs` sont pris en compte; les `product IDs` parents sont ignorés.

Vérification (end-to-end)
1. Dans l’admin, ouvrir l’option “Tablette” du pack concerné.
2. Vérifier qu’un produit en “0/N” n’est plus compté comme sélectionné.
3. Côté public (`/pod/pack/0`), ouvrir la modal “Tablette”:
   - les produits avec 0 variante sélectionnée ne doivent plus apparaître.
4. Test de non-régression:
   - un produit simple (sans variantes) sélectionné doit continuer à apparaître.
   - un produit à variantes avec au moins 1 variante sélectionnée doit apparaître uniquement avec ces variantes.

Détails techniques
```text
Avant (bug):
allowed_product_ids contient [product_id_parent, variant_id_A, ...]
=> si filteredVariants = 0 mais product_id_parent présent
=> produit inclus quand même

Après (fix):
if product.hasVariants:
   include only if selectedVariantIdsForProduct > 0
else:
   include only if product.id is explicitly selected
```

Impact attendu
- Disparition immédiate des faux positifs “0 variante sélectionnée mais produit visible”.
- Comportement cohérent entre admin et site public.
- Contrat API plus strict et prévisible.
