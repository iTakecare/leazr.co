# Environmental Data API Documentation

## Overview

L'API environnementale d'iTakecare permet de gérer et récupérer les données d'impact CO2 pour les catégories de produits et les produits individuels. Cette API fournit des données d'économies carbone pour améliorer la transparence environnementale du catalogue.

## Architecture

```
Base de données (category_environmental_data)
    ↓
Edge Functions (/environmental/categories, /categories, /environmental/products/{id})  
    ↓
Services (catalogService.ts)
    ↓
Hooks React (useEnvironmentalData, useCO2Calculator)
    ↓
Composants UI (CO2Badge, CO2SavingsCalculator, EnvironmentalDataManager)
```

## Endpoints disponibles

### 1. GET `/environmental/categories`
Récupère toutes les données environnementales par catégorie.

**URL**: `{company_slug}/environmental/categories`

**Réponse**:
```json
{
  "environmental_categories": [
    {
      "id": "env_123",
      "category": {
        "id": "cat_456", 
        "name": "laptop",
        "translation": "Ordinateurs portables"
      },
      "co2_savings_kg": 170,
      "carbon_footprint_reduction_percentage": 15,
      "energy_savings_kwh": 200,
      "water_savings_liters": 50,
      "waste_reduction_kg": 5,
      "source_url": "https://impactco2.fr",
      "last_updated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. GET `/categories`  
Récupère les catégories avec leurs données environnementales intégrées.

**URL**: `{company_slug}/categories`

**Réponse**:
```json
{
  "categories": [
    {
      "id": "cat_456",
      "name": "laptop", 
      "translation": "Ordinateurs portables",
      "company_id": "comp_789",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "co2_savings_kg": 170,
      "environmental_impact": {
        "id": "env_123",
        "co2_savings_kg": 170,
        "source_url": "https://impactco2.fr"
      }
    }
  ]
}
```

### 3. GET `/environmental/products/{productId}`
Récupère les données CO2 pour un produit spécifique.

**URL**: `{company_slug}/environmental/products/{productId}`

**Réponse**:
```json
{
  "product": {
    "product_id": "prod_123",
    "category_name": "laptop", 
    "co2_savings_kg": 170,
    "environmental_data": {
      "id": "env_123",
      "co2_savings_kg": 170,
      "source_url": "https://impactco2.fr"
    },
    "calculation_method": "category_based"
  }
}
```

## Services disponibles

### getEnvironmentalData(companySlug: string)
Récupère toutes les données environnementales pour une entreprise.

```typescript
import { getEnvironmentalData } from '@/services/catalogService';

const data = await getEnvironmentalData('itakecare');
```

### getCategoriesWithEnvironmentalData(companySlug: string) 
Récupère les catégories avec leurs données environnementales.

```typescript  
import { getCategoriesWithEnvironmentalData } from '@/services/catalogService';

const categories = await getCategoriesWithEnvironmentalData('itakecare');
```

### getProductCO2Data(companySlug: string, productId: string)
Récupère les données CO2 pour un produit spécifique.

```typescript
import { getProductCO2Data } from '@/services/catalogService';

const productCO2 = await getProductCO2Data('itakecare', 'prod_123');
```

## Hooks React disponibles

### useEnvironmentalData
Hook principal pour récupérer les données environnementales.

```typescript
import { useEnvironmentalData } from '@/hooks/environmental/useEnvironmentalData';

const { data, isLoading, error } = useEnvironmentalData(companySlug);
```

### useCO2Calculator  
Calcule les économies CO2 pour un produit ou un pack.

```typescript
import { useCO2Calculator } from '@/hooks/environmental/useCO2Calculator';

const co2Result = useCO2Calculator({
  category: 'laptop',
  quantity: 2,
  companySlug: 'itakecare'
});

// Résultat: { co2Kg, carKilometers, treeMonths, source, hasRealData }
```

### useBulkCO2Calculator
Calcule les économies CO2 pour plusieurs produits et packs simultanément.

```typescript
import { useBulkCO2Calculator } from '@/hooks/environmental/useBulkCO2Calculator';

const { products, packs, isLoading } = useBulkCO2Calculator({
  products: [{ id: '1', category: 'laptop' }],
  packs: [{ id: '1', items: [...] }],
  companySlug: 'itakecare'
});
```

## Données environnementales par défaut

### Catégories avec données réelles (source: Base de données iTakecare)
| Catégorie | CO2 économisé (kg) | Source |
|-----------|-------------------|---------|
| Serveurs | 300 | Base de données |
| Laptop/Desktop | 170 | Base de données |  
| Tablettes | 87 | Base de données |
| Écrans | 85 | Base de données |
| Imprimantes | 65 | Base de données |
| Smartphones | 45 | Base de données |
| Accessoires | 15-25 | Base de données |

### Données de fallback (source: impactco2.fr)
Utilisées automatiquement pour les catégories sans données réelles.

## Équivalences CO2

Le système calcule automatiquement les équivalences environnementales :

- **Distance en voiture** : 1 kg CO2 ≈ 6 km en voiture
- **Absorption d'arbres** : 1 kg CO2 ≈ 20 kg absorbés par arbre/mois

## Gestion des erreurs

- **Company slug manquant** : Erreur "Company slug is required"
- **Données indisponibles** : Utilisation automatique des données de fallback
- **Timeout API** : Cache React Query avec fallback local

## Cache et performance

- **Stale time** : 5-15 minutes selon l'endpoint
- **Cache time** : 10-60 minutes selon l'endpoint  
- **Background refetch** : Automatique selon la stratégie React Query