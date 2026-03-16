

## Refonte de l'en-tête catalogue avec catégories visuelles et filtre par marque

### Objectif
Reproduire l'UI du screenshot pour les catalogues public et client : header avec bannière, catégories en cartes avec icônes Phosphor-style, filtre par marque avec logos.

### Composants à créer/modifier

#### 1. Nouveau composant : `CatalogHeroBanner`
**Fichier : `src/components/catalog/public/CatalogHeroBanner.tsx`**
- Bannière avec fond dégradé/image (utilise `headerBackgroundType` des settings)
- Titre "Notre catalogue" + description
- 4 icônes de valeur (Pas d'investissement initial, Renouvellement facile, Maintenance incluse, Maîtrise des coûts)
- Utilise les Lucide icons (DollarSign, RefreshCw, Shield, TrendingDown)

#### 2. Nouveau composant : `CatalogCategoryCards`
**Fichier : `src/components/catalog/public/CatalogCategoryCards.tsx`**
- Cartes cliquables par catégorie avec icône stylisée (Lucide icons car Phosphor n'est pas installé — on utilisera des Lucide icons similaires dans des containers colorés pour reproduire le style Phosphor)
- Badge de compteur en haut à droite de chaque carte
- Mapping des catégories vers icônes et couleurs :
  - Laptop → `Laptop` (teal)
  - Accessoires Apple → `Apple` (violet)  
  - Smartphone → `Smartphone` (rose)
  - Écran → `Monitor` (bleu)
  - Tablette → `Tablet` (orange)
  - Logiciel → `AppWindow` (vert)
  - Desktop → `Monitor` (gris)
- Sélection visuelle (bordure highlight quand actif)
- Scrollable horizontalement sur mobile

#### 3. Nouveau composant : `CatalogBrandFilter`
**Fichier : `src/components/catalog/public/CatalogBrandFilter.tsx`**
- Ligne "Marques:" avec badges cliquables par marque
- Logo de la marque en inline (Apple , HP logo, Microsoft logo) via des URLs statiques ou icônes Lucide
- Compteur entre parenthèses
- Multi-sélection possible

#### 4. Enrichir le hook `usePublicSimplifiedFilter`
**Fichier : `src/hooks/products/usePublicSimplifiedFilter.ts`**
- Ajouter `selectedBrands: string[]` au state
- Extraire les marques avec compteurs depuis les produits
- Filtrer par marques sélectionnées
- Mettre à jour `hasActiveFilters`

#### 5. Modifier `PublicCatalogAnonymous` et `ClientCatalogAnonymous`
- Ajouter `CatalogHeroBanner` en haut (avant le filtre bar)
- Remplacer les badges de catégories dans `PublicCatalogFilterBar` par les `CatalogCategoryCards`
- Ajouter `CatalogBrandFilter` sous les cartes catégories
- Passer les nouvelles props (brands, selectedBrands) au filtre

#### 6. Modifier `PublicCatalogFilterBar`
- Retirer la section catégories (déplacée vers `CatalogCategoryCards`)
- Garder : search, count, sort, cart, devis
- Ajouter le style "Devis" en bouton teal plein (comme dans le screenshot)

### Mapping des icônes de catégories (style Phosphor via Lucide)

| Catégorie DB | Label | Icône Lucide | Couleur fond |
|---|---|---|---|
| Laptop | Ordinateur portable | `Laptop` | teal-100 |
| Accessoires Apple | Apple Accessories | `Headphones` | violet-100 |
| Smartphone | Smartphone | `Smartphone` | rose-100 |
| monitor | Écran | `Monitor` | blue-100 |
| Tablette | Tablette | `Tablet` | amber-100 |
| Software | Logiciel | `AppWindow` | emerald-100 |
| Desktop | Ordinateur de bureau | `MonitorDot` | slate-100 |

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/catalog/public/CatalogHeroBanner.tsx` | Créer — bannière hero |
| `src/components/catalog/public/CatalogCategoryCards.tsx` | Créer — cartes catégories |
| `src/components/catalog/public/CatalogBrandFilter.tsx` | Créer — filtre marques |
| `src/hooks/products/usePublicSimplifiedFilter.ts` | Modifier — ajouter brands au state |
| `src/components/catalog/public/PublicCatalogFilterBar.tsx` | Modifier — retirer catégories, ajouter style devis |
| `src/pages/PublicCatalogAnonymous.tsx` | Modifier — intégrer les nouveaux composants |
| `src/components/catalog/client/ClientCatalogAnonymous.tsx` | Modifier — même intégration |

