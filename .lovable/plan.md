

## Plan : Bouton de duplication pour les produits de prestataires externes

### Changement

**Fichier : `src/components/partners/ExternalProviderManager.tsx`**

1. Importer l'icône `Copy` depuis lucide-react
2. Ajouter un bouton `Copy` dans la colonne Actions de chaque produit (entre Pencil et Trash2, lignes ~314-322)
3. Au clic, appeler `createProviderProduct` (mutation existante `createProductMut`) avec les mêmes données du produit source mais sans `id`, et le nom suffixé " (copie)"

Aucun nouveau service nécessaire — on réutilise `createProductMut` déjà en place.

### UI résultante

```text
Actions: [✏️] [📋] [🗑️]
```

Le produit dupliqué apparaît immédiatement dans la liste avec " (copie)" dans le nom.

