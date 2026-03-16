

# Diagnostic : Prix d'achat à zéro pour les demandes client

## Constat

Après investigation approfondie de la base de données et du code :

1. **Les dernières demandes client (après les fixes précédents) ont les prix d'achat corrects** : MacBook Pro 14 M4 = 1179€, iPhone 17 Pro Max = 1154€, etc.
2. **L'offre e99dda8b visible dans la capture n'existe pas en DB** — elle a été créée avant l'application des corrections précédentes.
3. **Le code actuel fonctionne correctement** pour les nouvelles demandes.

## Problème résiduel identifié : Fonction RPC dupliquée

Il y a **deux versions** de la fonction `insert_offer_equipment_secure` en base :
- **Version 1** (19 params) : N'inclut PAS `product_id` ni `image_url` dans l'INSERT → ces champs sont silencieusement ignorés
- **Version 2** (21 params) : Inclut `product_id` et `image_url` ✓

Résultat : `product_id = NULL` pour tous les équipements créés, ce qui empêche le lien catalogue et pourrait causer des problèmes d'affichage d'image.

## Plan de correction

### 1. Supprimer la version obsolète de la fonction RPC
- **Migration SQL** : `DROP FUNCTION insert_offer_equipment_secure(uuid, text, numeric, integer, numeric, numeric, numeric, numeric, text, uuid, uuid, text, text, text, text, text, text, text, text)` (version sans product_id/image_url)
- Ne garder que la version complète avec `p_product_id` et `p_image_url`

### 2. Vérifier que les anciennes offres peuvent être corrigées
- Ajouter une logique dans `getOfferEquipment` pour enrichir le `purchase_price` depuis le catalogue si celui-ci est à 0 et qu'un `product_id` ou un titre correspondant existe
- Recherche par titre de produit dans la table `products` + `product_variant_prices` pour récupérer le prix d'achat réel

### 3. Enrichir les équipements existants sans purchase_price
- Dans `getOfferEquipment`, si `purchase_price = 0` et que le titre correspond à un produit connu, récupérer le prix depuis `product_variant_prices.price` en utilisant les attributs stockés dans `offer_equipment_attributes`

### Fichiers modifiés
| Fichier | Modification |
|---|---|
| Migration SQL | DROP de l'ancienne version de `insert_offer_equipment_secure` |
| `src/services/offers/offerEquipment.ts` | Enrichissement du purchase_price à 0 via lookup catalogue |

