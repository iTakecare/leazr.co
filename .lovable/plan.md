

## Fix "Produit inconnu" dans les demandes

### Cause racine

Dans `src/services/requestInfoService.ts` (ligne 62), la fonction `createProductRequest` génère un `product_id: uuidv4()` — un UUID aléatoire qui ne correspond à aucun produit en base. L'edge function `create-product-request` tente de chercher ce produit, échoue, et utilise "Produit inconnu" comme nom par défaut. Ce nom est ensuite stocké dans `equipment_description` et dans `offer_equipment.title`.

### Solution

**Fichier 1 : `src/services/requestInfoService.ts`**
- Remplacer le tableau `products` monolithique par un tableau mappé depuis les items du panier
- Passer les vrais `product_id` (depuis `item.product.id`), `variant_id` (depuis `selectedOptions`), quantité et prix unitaire de chaque item
- Ajouter un paramètre `cartItems` à `createProductRequest` et à l'interface `ProductRequestData`

**Fichier 2 : `src/components/checkout/RequestSummary.tsx`**
- Passer les items du panier à `createProductRequest` pour qu'il puisse extraire les vrais IDs produits

**Fichier 3 : `src/pages/ClientRequestsPage.tsx`**  
- Améliorer `formatEquipmentDescription` pour aussi chercher les titres dans `offer_equipment` si le texte brut n'est pas exploitable
- Alternative plus simple : joindre `offer_equipment` dans la requête `useClientOffers` et l'utiliser en priorité pour le titre

### Détail technique

```text
Avant:  products: [{ product_id: uuidv4(), quantity: totalQty, ... }]
Après:  products: items.map(item => ({ 
          product_id: item.product.id, 
          variant_id: findVariantId(item),
          quantity: item.quantity, 
          unit_price: monthlyPrice,
          purchase_price: purchasePrice 
        }))
```

### Fichiers impactés
1. `src/services/requestInfoService.ts` — passer les vrais product IDs au lieu de UUID aléatoires
2. `src/components/checkout/RequestSummary.tsx` — transmettre les items du panier à la fonction
3. `src/pages/ClientRequestsPage.tsx` — fallback sur `offer_equipment` pour l'affichage du titre

