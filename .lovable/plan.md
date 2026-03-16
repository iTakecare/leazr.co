
Objectif: corriger définitivement les prix d’achat à 0 pour les demandes issues du catalogue client, y compris celles déjà créées.

Constat validé (sur l’offre `ecd2326d-d843-4dd1-8b54-dc5ca5a9fdd3`)
- L’offre est de type `web_request` (flux Edge Function `create-product-request`), pas `client_request`.
- Les lignes `offer_equipment` ont `purchase_price = 0`, `product_id` présent, `monthly_payment` correct.
- Les logs Edge montrent que le frontend envoie bien `purchase_price` (ex: 1179) mais **sans `variant_id`**.
- Dans l’Edge Function, sans `variant_id`, le fallback lit `products.price` (0 pour produits à variantes) ⇒ prix d’achat final à 0.
- L’enrichissement actuel (`enrichEquipmentPurchasePrices`) ne récupère pas ce cas quand les attributs sont absents.

Plan d’implémentation
1) Corriger le payload frontend (source du problème)
- Fichier: `src/services/requestInfoService.ts`
- Ajouter une résolution de `variant_id` côté frontend quand absent:
  - depuis `item.selectedOptions` (clé interne si présente),
  - sinon en matchant `selectedOptions` avec `item.product.variant_combination_prices[].attributes`,
  - en comparaison tolérante (trim + case-insensitive).
- Envoyer aussi `selected_attributes` (copie nettoyée des options) dans chaque `products[]` pour fallback serveur.
- Résultat attendu: l’Edge Function récupère le vrai prix DB via `product_variant_prices.id`.

2) Rendre l’Edge Function robuste même si le frontend ne fournit pas `variant_id`
- Fichier: `supabase/functions/create-product-request/index.ts`
- Si `variant_id` absent:
  - tenter de retrouver la variante via `selected_attributes` (si fourni),
  - sinon fallback par correspondance `monthly_price` unitaire (et éventuellement `purchase_price` payload) dans `product_variant_prices` pour ce `product_id`.
- Utiliser ensuite ce variant trouvé comme source vérité pour `price` et `attributes`.
- Garder un log explicite du mode de résolution (`variant_id`, `selected_attributes`, `monthly_match`, `fallback_payload`).

3) Corriger l’affichage des offres déjà cassées (backward fix)
- Fichier: `src/services/offers/offerEquipment.ts`
- Étendre `enrichEquipmentPurchasePrices`:
  - quand `purchase_price=0`, `product_id` présent, **et pas d’attributs**:
    - calculer mensualité unitaire = `monthly_payment / quantity`,
    - chercher dans `product_variant_prices` de ce produit la ligne avec `monthly_price` correspondante,
    - appliquer `price` trouvé comme `purchase_price`.
- Ainsi, les anciennes demandes s’affichent correctement sans attendre une recréation.

4) Backfill DB optionnel mais recommandé (pour figer les données)
- Ajouter une migration SQL de correction des `offer_equipment.purchase_price = 0`:
  - match via `product_id` + `monthly_payment/quantity` sur `product_variant_prices.monthly_price`,
  - update uniquement si un match unique est trouvé.
- Cela évite de recalculer à chaque lecture.

Validation (à faire après implémentation)
- Test E2E flux catalogue client (inline request steps) avec variantes:
  - vérifier en DB: `offer_equipment.purchase_price > 0`, `variant_id` (si colonne), attributs présents.
  - vérifier en admin: colonnes P.A unitaire/total correctes, marge cohérente.
- Re-tester l’offre existante `ecd2326d-...`:
  - affichage admin corrigé immédiatement via enrichissement (même sans recréation).
- Vérifier qu’aucune régression sur flux public/partenaire (site internet).

Détails techniques (non-fonctionnels)
- Garder la convention existante: `monthly_payment` = total ligne, `selling_price` = unitaire.
- Conserver la priorité des prix réels variante (`price` / `purchase_price`) sur les fallbacks.
- Éviter toute dépendance à des clés internes uniquement (`variant_id`) en ajoutant un fallback déterministe basé sur attributs/mensualité.
