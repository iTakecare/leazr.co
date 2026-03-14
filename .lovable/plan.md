

## Problème identifié

Le champ `brand_name` dans la table `products` contient des valeurs obsolètes ("Generic", "Non spécifié", vide) au lieu du vrai nom de marque. Ce champ dénormalisé n'est pas synchronisé avec la table `brands`.

**Données actuelles (exemples) :**
- iPad Pro M4 → `brand_id` = Apple, mais `brand_name` = "Non spécifié"
- MacBook Pro 16 M4 → `brand_id` = Apple, mais `brand_name` = "Generic"
- HP Elitebook 860 → `brand_id` = HP, mais `brand_name` = "Generic"

**Impact API :** Les endpoints packs/partenaires utilisent `brand_name` directement (pas le join `brands`), donc le consommateur reçoit "Generic" au lieu de "Apple".

## Plan de correction

### 1. Mise à jour des données existantes (SQL one-shot)
Exécuter un `UPDATE` qui synchronise `brand_name` depuis la table `brands` pour tous les produits ayant un `brand_id` valide :
```sql
UPDATE products p
SET brand_name = b.name
FROM brands b
WHERE p.brand_id = b.id
  AND (p.brand_name IS NULL OR p.brand_name = '' OR p.brand_name = 'Generic' OR p.brand_name = 'Non spécifié');
```

### 2. Aussi synchroniser `category_name` (même risque)
Vérifier et corriger `category_name` de la même façon.

### 3. Trigger de synchronisation automatique
Créer un trigger sur la table `products` qui met à jour `brand_name` automatiquement quand `brand_id` change, pour éviter que le problème ne se reproduise.

### 4. Uniformiser l'API
Dans `getProducts` et `getProduct`, ajouter un mapping qui écrit `brand: brands.name` et `category: categories.translation || categories.name` en champs plats dans la réponse, pour que tous les endpoints retournent le même format.

### Fichiers à modifier
- **SQL** : UPDATE données + trigger
- **`supabase/functions/catalog-api/index.ts`** : Normaliser les réponses des endpoints `getProducts`/`getProduct` pour aplatir brand/category

