

## Problème

Le catalogue client (`ClientCatalogAnonymous.tsx`) a un layout très différent du catalogue public (`PublicCatalogAnonymous.tsx`) :

| Élément | Catalogue public | Catalogue client (actuel) |
|---|---|---|
| Navigation | `UnifiedNavigationBar` avec filtres intégrés | Hero banner gradient + sidebar filtres |
| Filtres | Barre simplifiée dans la nav (search + catégories chips) | `PublicFilterSidebar` complète (sidebar latérale) |
| Tabs produits/packs | Underline style bleu-teal (`border-b-2`) | Rounded pills style |
| Layout | Full-width, pas de sidebar | 2 colonnes (sidebar + grille) |
| Vue produit | `InlinePublicProductDetail` inline | `ClientProductDetail` séparé |
| Panier | `InlinePublicCart` + `InlineRequestSteps` inline | Navigation vers URL séparée |

## Plan — Aligner le catalogue client sur le public

### Modification unique : `src/components/catalog/client/ClientCatalogAnonymous.tsx`

Réécrire le composant pour reproduire exactement le même layout que `PublicCatalogAnonymous.tsx` :

1. **Remplacer le hero banner + sidebar** par `UnifiedNavigationBar` avec les mêmes props (filtres simplifiés intégrés, boutons panier/devis)
2. **Utiliser `usePublicSimplifiedFilter`** au lieu de `useOptimizedCatalogFilter` (le public n'utilise pas la sidebar avec prix/marques)
3. **Tabs identiques** : style underline teal (`border-b-2 border-[#4ab6c4]`) au lieu des pills arrondies
4. **Ajouter les vues inline** : `InlinePublicProductDetail`, `InlinePublicCart`, `InlineRequestSteps` au lieu de naviguer vers des URLs séparées
5. **Supprimer** : hero banner, `PublicFilterSidebar`, `FilterMobileToggle`, `FilterBadges`, `SortFilter`
6. **Conserver** : le badge "Prix personnalisés" si `hasCustomCatalog`, et la logique de catalogue personnalisé (`getClientCustomCatalog`)

Le résultat sera visuellement identique au catalogue public, avec en plus le support des prix personnalisés pour les clients.

