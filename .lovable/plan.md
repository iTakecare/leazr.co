

## Analyse : Flux de réception des demandes partenaires

### Ce qui est déjà en place et fonctionne

1. **Prix promo des packs** : L'Edge Function `create-product-request` reçoit `unit_price` (mensualité totale de la ligne) directement depuis iTakecare. Ce prix est celui affiché au client, donc déjà le prix promo du pack partenaire. Les calculs de marge, coefficient et montant financé sont basés sur ce prix. Correct.

2. **Packs personnalisés** : Les packs avec réductions progressives sont stockés dans `offer_custom_packs` avec `discount_percentage`, `original_monthly_total`, `discounted_monthly_total`, et `monthly_savings`. Les équipements sont liés au pack via `custom_pack_id`. Correct.

3. **Services externes** : Insertion dans `offer_external_services` avec provider_name, product_name, price, billing_period, quantity. Correct.

4. **Tag partenaire** : Le type `partner_request` est bien défini avec le label "Partenaire - {nom}" et l'icône Handshake. Correct.

5. **Affichage admin** : `ExternalServicesSection` affiche les services dans la vue détail. Correct.

### Ce qui manque (2 points)

#### 1. L'email admin ne mentionne ni le partenaire ni les services externes
L'email de notification aux administrateurs (lignes 976-1034) ne contient aucune mention du partenaire source ni des services externes sélectionnés. Un admin qui reçoit l'email ne sait pas que la demande vient d'un partenaire spécifique ni quels services ont été choisis.

**Correction** : Ajouter dans l'email admin :
- Un bloc "Source partenaire" si `data.partner_slug` est présent (nom du partenaire)
- Un bloc "Services externes" listant les services avec prix et périodicité

#### 2. La réponse API ne renvoie pas les infos partenaire ni services externes
La réponse JSON (lignes 1134-1148) ne contient pas `partner_slug`, `partner_name`, ni un résumé des services externes insérés. Le front iTakecare ne peut pas confirmer que ces données ont été prises en compte.

**Correction** : Ajouter à `responseData` :
- `partner_slug`, `partner_name`
- `external_services_count` (nombre de services insérés)

### Fichiers à modifier

- `supabase/functions/create-product-request/index.ts` : email admin + réponse API

### Résumé

Le flux de prix est correct : les mensualités promo des packs partenaires sont bien utilisées. Les services externes sont bien stockés. Il manque uniquement leur visibilité dans l'email admin et la confirmation dans la réponse API.

