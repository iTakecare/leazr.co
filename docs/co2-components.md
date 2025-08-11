# Composants CO2 - Documentation

## Overview

Les composants CO2 permettent d'afficher les données environnementales de manière cohérente dans toute l'application. Ils utilisent les hooks environnementaux pour récupérer et calculer automatiquement les économies carbone.

## Composants disponibles

### CO2Badge

Badge visuel affichant les économies CO2 avec des équivalences.

```typescript
import { CO2Badge } from '@/components/environmental/CO2Badge';

<CO2Badge
  co2Kg={170}
  size="medium"
  position="top-right"
  hasRealData={true}
  showEquivalents={true}
  carKilometers={1020}
  className="custom-class"
/>
```

**Props** :
- `co2Kg`: Quantité de CO2 économisé en kg (requis)
- `size`: Taille du badge ('small' | 'medium' | 'large')
- `position`: Position du badge ('top-right' | 'top-left' | 'bottom-right' | 'bottom-left')
- `hasRealData`: Indique si les données proviennent de la base ou du fallback
- `showEquivalents`: Affiche les équivalences (voiture, arbres)
- `carKilometers`: Distance équivalente en voiture (calculé automatiquement)
- `className`: Classes CSS additionnelles

### CO2SavingsCalculator

Composant calculant et affichant les économies CO2 pour un produit individuel.

```typescript
import { CO2SavingsCalculator } from '@/components/environmental/CO2SavingsCalculator';

<CO2SavingsCalculator
  category="laptop"
  quantity={2}
  companySlug="itakecare"
/>
```

**Props** :
- `category`: Nom de la catégorie du produit (requis)
- `quantity`: Quantité de produits (défaut: 1)
- `companySlug`: Slug de l'entreprise (optionnel si détecté automatiquement)

**Fonctionnalités** :
- Calcul automatique des économies CO2 par catégorie
- Affichage des équivalences (voiture, arbres)
- Distinction visuelle entre données réelles et de fallback
- Gestion du loading state

### PackCO2SavingsDisplay

Composant spécialisé pour calculer les économies CO2 des packs multi-produits.

```typescript
import { PackCO2SavingsDisplay } from '@/components/environmental/PackCO2SavingsDisplay';

<PackCO2SavingsDisplay
  items={[
    {
      quantity: 2,
      product: {
        category: { name: "laptop" }
      }
    },
    {
      quantity: 1, 
      product: {
        category_name: "monitor"
      }
    }
  ]}
  packQuantity={3}
  companySlug="itakecare"
/>
```

**Props** :
- `items`: Array des items du pack avec leurs quantités
- `packQuantity`: Nombre de packs commandés (défaut: 1)
- `companySlug`: Slug de l'entreprise (optionnel)

**Fonctionnalités** :
- Agrégation des économies CO2 de tous les items du pack
- Gestion des catégories multiples (format standardisé et legacy)
- Multiplication par la quantité de packs
- Comptage des items physiques (exclut le software avec 0 kg CO2)

### EnvironmentalDataManager

Interface d'administration pour gérer les données environnementales.

```typescript
import EnvironmentalDataManager from '@/components/admin/environmental/EnvironmentalDataManager';

// Utilisé dans l'onglet Environnement de la gestion du catalogue
<EnvironmentalDataManager />
```

**Fonctionnalités** :
- Liste toutes les catégories avec leurs données CO2
- Permet la modification des valeurs d'économies carbone
- Affiche la source des données (base de données vs fallback)
- Gestion des URLs sources personnalisées
- Interface CRUD pour les données environnementales

## Hooks associés

### useCO2Calculator
Hook principal pour les calculs CO2 individuels.

```typescript
const result = useCO2Calculator({
  category: 'laptop',
  quantity: 2,
  companySlug: 'itakecare'
});

// result: CO2CalculationResult
// {
//   co2Kg: 340,
//   carKilometers: 2040,
//   treeMonths: 17,
//   source: 'Database',
//   hasRealData: true
// }
```

### usePackCO2Calculator  
Hook spécialisé pour les calculs de packs.

```typescript
const result = usePackCO2Calculator(items, packQuantity, companySlug);

// result: CO2CalculationResult + physicalItemsCount
// {
//   ...co2Data,
//   physicalItemsCount: 6 // Exclut les logiciels
// }
```

### useBulkCO2Calculator
Hook pour calculs en masse (optimisé performance).

```typescript
const { products, packs, isLoading } = useBulkCO2Calculator({
  products: [{ id: '1', category: 'laptop' }],
  packs: [{ id: '1', items: [...] }],
  companySlug: 'itakecare'
});

// products: Record<string, CO2CalculationResult>
// packs: Record<string, CO2CalculationResult>
```

## Utilitaires

### co2Utils.ts

#### calculateCO2Equivalents(co2Kg: number)
Calcule les équivalences environnementales.

```typescript
const equivalents = calculateCO2Equivalents(170);
// { carKilometers: 1020, treeMonths: 8 }
```

#### normalizeCategoryName(category: string)
Normalise les noms de catégories pour le matching.

```typescript
const normalized = normalizeCategoryName('Ordinateur portable');
// 'laptop'
```

#### getCO2DataForCategory(category, environmentalData)
Récupère les données CO2 pour une catégorie.

```typescript
const data = getCO2DataForCategory('laptop', environmentalData);
// { co2Kg: 170, source: 'Database', hasRealData: true }
```

## Intégration dans les cards

### ProductGridCard
Affiche automatiquement les badges CO2 sur les cards produit du catalogue public.

### ProductCard (Admin)  
Affiche les données CO2 dans l'interface d'administration avec possibilité d'édition.

### PublicPackCard
Calcule et affiche les économies CO2 totales pour les packs dans le catalogue public.

## Styles et theming

Les composants utilisent le design system de l'application :

- **Couleurs** : Tokens sémantiques depuis `index.css`
- **Icônes** : Lucide React (Leaf, Car, Trees, etc.)
- **Animations** : Transitions CSS cohérentes
- **Responsive** : Adaptatif mobile/desktop

## Gestion des états

- **Loading** : Skeleton loaders pendant le chargement
- **Error** : Fallback graceful vers données impactco2.fr  
- **Empty** : Message informatif si aucune donnée
- **Real vs Fallback** : Distinction visuelle claire

## Accessibilité

- Labels ARIA appropriés
- Contraste de couleurs conforme WCAG
- Navigation clavier supportée
- Textes alternatifs pour les équivalences