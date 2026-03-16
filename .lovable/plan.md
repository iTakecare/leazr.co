

## Fix : Équipements non sauvegardés dans les demandes web

### Cause racine (logs Edge Function)

L'insertion dans `offer_equipment` échoue avec une **violation de clé étrangère** :

```
Key (product_id)=(7dfaf771-...) is not present in table "products"
```

Le `product_id` envoyé par le frontend n'existe pas dans la table `products` (peut être un ID de variante client, ou un produit supprimé du localStorage). L'edge function tente d'insérer cet ID invalide comme `product_id`, ce qui viole la contrainte FK et **aucun équipement n'est créé**.

Résultat visible : "Aucun équipement trouvé" dans la page admin.

### Solution

**Fichier : `supabase/functions/create-product-request/index.ts`** (lignes ~558-577)

Avant d'insérer dans `offer_equipment`, vérifier si le `product_id` a été trouvé dans la DB. Si le produit n'a pas été trouvé (déjà détecté à la ligne ~209 avec `productError`), mettre `product_id: null` au lieu de l'ID invalide. Concrètement :

1. Dans la boucle de traitement des produits (ligne ~196), stocker un flag `productFound` dans `equipmentCalculations`
2. Dans la boucle d'insertion des équipements (ligne ~558), utiliser `product_id: calc.productFound ? calc.productId : null`
3. Utiliser `product.product_name` (envoyé par le frontend) comme titre quand le produit n'est pas trouvé en DB, au lieu de "Produit inconnu"

Redéployer ensuite la fonction.

### Fichiers impactés
1. `supabase/functions/create-product-request/index.ts` — gérer gracieusement les product_id invalides

