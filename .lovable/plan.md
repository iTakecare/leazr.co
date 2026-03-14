

## Plan : Afficher les variantes des produits dans l'éditeur d'options

### Problème

Actuellement, la liste des produits dans `PartnerPackOptionsEditor` n'affiche que le nom du produit parent. Les produits avec variantes (RAM, stockage, etc.) ne montrent pas leurs déclinaisons. L'admin ne peut pas choisir quelles variantes spécifiques autoriser.

### Solution

Modifier `PartnerPackOptionsEditor` pour afficher les produits **avec leurs variantes** dans la liste de sélection. Les produits avec `product_variant_prices` seront affichés en arborescence : le parent comme en-tête, puis chaque variante indentée avec ses attributs et son prix mensuel.

### Changements

**Fichier : `src/components/partners/PartnerPackOptionsEditor.tsx`**

1. **Enrichir la requête produits** : `getProducts` retourne déjà `product_variant_prices` (voir catalogService L24-30). Ces données sont disponibles.

2. **Refondre la liste de sélection** pour afficher une arborescence :
   - Produit sans variantes → checkbox simple (comme aujourd'hui)
   - Produit avec variantes → label parent non-sélectionnable + sous-liste indentée de chaque variante avec :
     - Checkbox
     - Attributs formatés (ex: "16Go RAM / 512Go SSD")
     - Prix mensuel
   - L'ID stocké dans `allowed_product_ids` sera le `product_variant_price.id` (préfixé `vprice_`) pour distinguer des product IDs

3. **Ajouter un toggle "Tout sélectionner"** par produit parent pour cocher/décocher toutes ses variantes d'un coup

4. **Mettre à jour le compteur** pour refléter le nombre de variantes sélectionnées

### Structure de rendu

```text
☐ MacBook Air M2 (Apple)                    [Tout sélectionner]
   ☐ 8Go RAM / 256Go SSD                    12.50 EUR/mois
   ☐ 8Go RAM / 512Go SSD                    15.00 EUR/mois
   ☐ 16Go RAM / 512Go SSD                   18.00 EUR/mois
☑ Écran 24" Samsung (Samsung)                9.99 EUR/mois
```

### Impact sur le stockage

Les `allowed_product_ids` contiendront un mix de :
- IDs de produits simples (UUID produit)
- IDs de variantes prix (UUID `product_variant_prices`)

L'API catalog-api devra interpréter ces deux types — mais comme elle enrichit déjà les produits avec leurs variantes, le site client pourra filtrer côté front.

