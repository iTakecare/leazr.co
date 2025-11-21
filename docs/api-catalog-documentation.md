# Documentation API Catalog iTakecare

## URL de base

```
https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api
```

## Authentification

Toutes les requêtes nécessitent une clé API valide dans le header :

```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

## Format général des réponses

Toutes les réponses sont au format JSON.

### Codes de statut HTTP

- `200` : Succès
- `401` : Clé API invalide ou manquante
- `404` : Ressource non trouvée
- `500` : Erreur serveur interne

---

## Endpoints disponibles

### 1. Liste des catégories

**GET** `/v1/{company-slug}/categories`

Récupère la liste de toutes les catégories de produits disponibles.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise (ex: `itakecare`)

#### Réponse

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Laptop",
      "translation": "Ordinateur portable",
      "description": "Description de la catégorie",
      "environmental_data": {
        "co2_savings_kg": 170,
        "energy_savings_kwh": 250,
        "waste_reduction_kg": 15,
        "water_savings_liters": 1000
      },
      "count": 42
    }
  ],
  "total": 15
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/categories' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 2. Liste des produits

**GET** `/v1/{company-slug}/products`

Récupère la liste paginée des produits avec filtres optionnels.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise
- `page` (query, optionnel) : Numéro de page (défaut: 1)
- `limit` (query, optionnel) : Nombre de résultats par page (défaut: 20, max: 100)
- `category` (query, optionnel) : Filtrer par ID de catégorie
- `brand` (query, optionnel) : Filtrer par ID de marque
- `active` (query, optionnel) : Filtrer par statut actif (`true`/`false`)

#### Réponse

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "MacBook Pro 16 M4 Pro",
      "slug": "macbook-pro-16-m4-pro",
      "short_description": "Ordinateur portable haute performance",
      "description": "Description complète du produit...",
      "purchase_price": 299900,
      "monthly_price": 8500,
      "image_url": "https://storage.url/image.jpg",
      "active": true,
      "brand": {
        "id": "uuid",
        "name": "Apple",
        "translation": "Apple"
      },
      "category": {
        "id": "uuid",
        "name": "Laptop",
        "translation": "Ordinateur portable"
      },
      "has_variants": true,
      "variant_count": 5,
      "specifications": {
        "processor": "Apple M4 Pro",
        "ram": "16 GB",
        "storage": "512 GB SSD"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products?page=1&limit=20&category=uuid&active=true' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 3. Détail d'un produit

**GET** `/v1/{company-slug}/products/{product-id}`

Récupère toutes les informations détaillées d'un produit spécifique, incluant ses variantes.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise
- `product-id` (path) : L'ID UUID du produit

#### Réponse

```json
{
  "id": "uuid",
  "name": "MacBook Pro 16 M4 Pro",
  "slug": "macbook-pro-16-m4-pro",
  "short_description": "Ordinateur portable haute performance",
  "description": "Description complète du produit avec markdown...",
  "purchase_price": 299900,
  "monthly_price": 8500,
  "image_url": "https://storage.url/image.jpg",
  "gallery_images": [
    "https://storage.url/image1.jpg",
    "https://storage.url/image2.jpg"
  ],
  "active": true,
  "brand": {
    "id": "uuid",
    "name": "Apple",
    "translation": "Apple",
    "website_url": "https://www.apple.com"
  },
  "category": {
    "id": "uuid",
    "name": "Laptop",
    "translation": "Ordinateur portable",
    "description": "Catégorie des ordinateurs portables"
  },
  "specifications": {
    "processor": "Apple M4 Pro",
    "ram": "16 GB",
    "storage": "512 GB SSD",
    "display": "16 pouces Liquid Retina XDR"
  },
  "variants": [
    {
      "id": "uuid",
      "variant_name": "16 GB RAM / 512 GB SSD",
      "attributes": {
        "ram": "16 GB",
        "storage": "512 GB"
      },
      "purchase_price": 299900,
      "monthly_price": 8500,
      "is_available": true
    }
  ],
  "environmental_data": {
    "co2_savings_kg": 170,
    "energy_savings_kwh": 250
  }
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/52605c7f-fe21-442d-9d5c-e827240fa763' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 4. Produits recommandés (Upsells) ⭐

**GET** `/v1/{company-slug}/products/{product-id}/upsells`

**Endpoint crucial pour les recommandations de produits.**

Récupère les produits recommandés à acheter avec le produit donné. Le système utilise une approche en deux niveaux :

1. **Upsells manuels** (prioritaires) : Produits spécifiquement configurés par les administrateurs
2. **Upsells automatiques** (fallback) : Si aucun upsell manuel n'existe, le système suggère automatiquement des produits similaires de la même catégorie

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise
- `product-id` (path) : L'ID UUID du produit source
- `limit` (query, optionnel) : Nombre maximum de résultats (défaut: 10, max: 50)

#### Réponse

```json
{
  "upsells": [
    {
      "id": "uuid",
      "name": "Souris Apple Magic Mouse",
      "slug": "souris-apple-magic-mouse",
      "short_description": "Souris sans fil rechargeable",
      "purchase_price": 8900,
      "monthly_price": 250,
      "image_url": "https://storage.url/mouse.jpg",
      "brand": {
        "id": "uuid",
        "name": "Apple",
        "translation": "Apple"
      },
      "category": {
        "id": "uuid",
        "name": "Mouse",
        "translation": "Souris"
      },
      "source": "manual",
      "priority": 1,
      "upsell_reason": "Parfait complément pour votre MacBook"
    },
    {
      "id": "uuid",
      "name": "Clavier Apple Magic Keyboard",
      "slug": "clavier-apple-magic-keyboard",
      "short_description": "Clavier sans fil rechargeable",
      "purchase_price": 11900,
      "monthly_price": 340,
      "image_url": "https://storage.url/keyboard.jpg",
      "brand": {
        "id": "uuid",
        "name": "Apple",
        "translation": "Apple"
      },
      "category": {
        "id": "uuid",
        "name": "Keyboard",
        "translation": "Clavier"
      },
      "source": "manual",
      "priority": 2,
      "upsell_reason": "Améliore votre expérience de frappe"
    },
    {
      "id": "uuid",
      "name": "MacBook Air 13 M3",
      "slug": "macbook-air-13-m3",
      "short_description": "Ordinateur portable léger et puissant",
      "purchase_price": 149900,
      "monthly_price": 4250,
      "image_url": "https://storage.url/macbook-air.jpg",
      "brand": {
        "id": "uuid",
        "name": "Apple",
        "translation": "Apple"
      },
      "category": {
        "id": "uuid",
        "name": "Laptop",
        "translation": "Ordinateur portable"
      },
      "source": "compatibility",
      "priority": null,
      "upsell_reason": "Produit similaire de la même catégorie"
    }
  ],
  "total": 3,
  "manual_count": 2,
  "auto_count": 1,
  "metadata": {
    "source_product_id": "52605c7f-fe21-442d-9d5c-e827240fa763",
    "has_manual_upsells": true
  }
}
```

#### Champs importants

- **`source`** : 
  - `"manual"` = Upsell configuré manuellement par l'administrateur (prioritaire)
  - `"compatibility"` = Upsell automatique basé sur la similarité de catégorie (fallback)
  
- **`priority`** : Ordre de priorité pour les upsells manuels (1 = le plus important)

- **`upsell_reason`** : Raison textuelle de la recommandation (peut être personnalisée pour les upsells manuels)

#### Notes importantes

✅ **Les prix sont en centimes** : Diviser par 100 pour afficher en euros (ex: `8900` = 89,00 €)

✅ **Images publiques** : Toutes les `image_url` sont accessibles publiquement sans authentification

✅ **Fallback intelligent** : Si aucun upsell manuel n'est configuré, le système retourne automatiquement des produits similaires de la même catégorie

✅ **Ordre de priorité** : Les upsells manuels apparaissent toujours en premier, triés par `priority`, suivis des suggestions automatiques

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/52605c7f-fe21-442d-9d5c-e827240fa763/upsells?limit=4' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

#### Exemple JavaScript/TypeScript

```typescript
async function getProductUpsells(productId: string, limit = 10) {
  const response = await fetch(
    `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/${productId}/upsells?limit=${limit}`,
    {
      headers: {
        'x-api-key': 'YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Afficher les upsells manuels en premier
  const manualUpsells = data.upsells.filter(u => u.source === 'manual');
  const autoUpsells = data.upsells.filter(u => u.source === 'compatibility');
  
  console.log(`${manualUpsells.length} upsells manuels`);
  console.log(`${autoUpsells.length} suggestions automatiques`);
  
  return data;
}
```

---

### 5. Données environnementales d'un produit

**GET** `/v1/{company-slug}/products/{product-id}/co2`

Récupère les données environnementales et l'impact écologique d'un produit.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise
- `product-id` (path) : L'ID UUID du produit

#### Réponse

```json
{
  "product": {
    "id": "uuid",
    "name": "MacBook Pro 16 M4 Pro",
    "category": "Ordinateur portable"
  },
  "environmental_data": {
    "co2_savings_kg": 170,
    "energy_savings_kwh": 250,
    "waste_reduction_kg": 15,
    "water_savings_liters": 1000,
    "carbon_footprint_reduction_percentage": 65,
    "source_url": "https://source.com",
    "last_updated": "2024-01-15T10:30:00Z"
  },
  "has_environmental_data": true
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/52605c7f-fe21-442d-9d5c-e827240fa763/co2' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 6. Recherche de produits

**GET** `/v1/{company-slug}/search`

Recherche de produits par nom, description ou catégorie.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise
- `q` (query, **requis**) : Terme de recherche
- `limit` (query, optionnel) : Nombre de résultats (défaut: 20, max: 100)

#### Réponse

```json
{
  "results": [
    {
      "id": "uuid",
      "name": "MacBook Pro 16 M4 Pro",
      "slug": "macbook-pro-16-m4-pro",
      "short_description": "Ordinateur portable haute performance",
      "purchase_price": 299900,
      "monthly_price": 8500,
      "image_url": "https://storage.url/image.jpg",
      "brand": {
        "name": "Apple"
      },
      "category": {
        "name": "Laptop",
        "translation": "Ordinateur portable"
      },
      "match_score": 0.95
    }
  ],
  "total": 1,
  "query": "macbook pro"
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/search?q=macbook&limit=10' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 7. Liste des marques

**GET** `/v1/{company-slug}/brands`

Récupère la liste de toutes les marques disponibles avec le nombre de produits associés.

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise

#### Réponse

```json
{
  "brands": [
    {
      "id": "uuid",
      "name": "Apple",
      "translation": "Apple",
      "website_url": "https://www.apple.com",
      "product_count": 42
    },
    {
      "id": "uuid",
      "name": "Dell",
      "translation": "Dell",
      "website_url": "https://www.dell.com",
      "product_count": 38
    }
  ],
  "total": 15
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/brands' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

### 8. Personnalisations de l'entreprise

**GET** `/v1/{company-slug}/customizations`

Récupère les paramètres de personnalisation visuelle de l'entreprise (couleurs, logos, bannières).

#### Paramètres

- `company-slug` (path) : Le slug de l'entreprise

#### Réponse

```json
{
  "company": {
    "id": "uuid",
    "name": "iTakecare",
    "slug": "itakecare"
  },
  "customizations": {
    "logo_url": "https://storage.url/logo.png",
    "favicon_url": "https://storage.url/favicon.ico",
    "primary_color": "#3B82F6",
    "secondary_color": "#10B981",
    "accent_color": "#F59E0B",
    "header_enabled": true,
    "header_title": "Leasing informatique éco-responsable",
    "header_description": "Équipez votre entreprise sans compromis",
    "header_background_type": "gradient",
    "header_background_config": {
      "from": "#3B82F6",
      "to": "#10B981"
    },
    "company_name": "iTakecare SRL",
    "company_email": "hello@itakecare.be",
    "company_phone": "+32 (0)71 49 16 85",
    "company_address": "Avenue du Général Michel 1E, BE-6000 Charleroi",
    "company_vat_number": "BE0795.642.894",
    "quote_request_url": "https://itakecare.be/contact"
  }
}
```

#### Exemple cURL

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/customizations' \
  -H 'x-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

## Gestion des erreurs

### Format des erreurs

```json
{
  "error": "Description de l'erreur",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional info"
  }
}
```

### Codes d'erreur courants

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | La clé API est invalide ou manquante |
| `COMPANY_NOT_FOUND` | Le slug de l'entreprise n'existe pas |
| `PRODUCT_NOT_FOUND` | Le produit demandé n'existe pas |
| `INVALID_PARAMETERS` | Les paramètres de la requête sont invalides |
| `INTERNAL_ERROR` | Erreur serveur interne |

---

## Bonnes pratiques

### 1. Gestion du cache

Les réponses de l'API peuvent être mises en cache côté client. Recommandations :

- **Catégories et marques** : Cache longue durée (24h)
- **Liste de produits** : Cache moyenne durée (1h)
- **Détail produit** : Cache courte durée (15min)
- **Upsells** : Cache courte durée (15min)
- **Recherche** : Pas de cache (résultats dynamiques)

### 2. Pagination

Pour de meilleures performances, limitez le nombre de résultats par page :

```typescript
// ✅ Bon
const products = await fetch('/products?page=1&limit=20')

// ❌ À éviter
const products = await fetch('/products?page=1&limit=1000')
```

### 3. Gestion des images

Toutes les images sont optimisées et accessibles via CDN. Utilisez les URLs fournies directement :

```typescript
// ✅ Bon
<img src={product.image_url} alt={product.name} />

// ❌ Inutile de re-traiter
<img src={optimizeImage(product.image_url)} alt={product.name} />
```

### 4. Prix et devise

Les prix sont toujours en centimes d'euro :

```typescript
// ✅ Bon
const priceEuros = product.purchase_price / 100
const formatted = `${priceEuros.toFixed(2)} €`

// Pour les mensualités
const monthlyEuros = product.monthly_price / 100
const formattedMonthly = `${monthlyEuros.toFixed(2)} €/mois`
```

---

## Exemples d'intégration

### React/Next.js avec TypeScript

```typescript
// types/catalog.ts
export interface Product {
  id: string
  name: string
  slug: string
  short_description: string
  purchase_price: number
  monthly_price: number
  image_url: string
  brand: {
    id: string
    name: string
  }
  category: {
    id: string
    name: string
    translation: string
  }
}

export interface Upsell extends Product {
  source: 'manual' | 'compatibility'
  priority: number | null
  upsell_reason: string
}

// services/catalogApi.ts
const API_BASE = 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api'
const API_KEY = process.env.NEXT_PUBLIC_CATALOG_API_KEY

export class CatalogAPI {
  private static async fetch(endpoint: string) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API Error')
    }
    
    return response.json()
  }

  static async getProduct(productId: string): Promise<Product> {
    const data = await this.fetch(`/v1/itakecare/products/${productId}`)
    return data
  }

  static async getProductUpsells(productId: string, limit = 4): Promise<Upsell[]> {
    const data = await this.fetch(`/v1/itakecare/products/${productId}/upsells?limit=${limit}`)
    return data.upsells
  }

  static async searchProducts(query: string, limit = 20): Promise<Product[]> {
    const data = await this.fetch(`/v1/itakecare/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    return data.results
  }
}

// components/ProductUpsells.tsx
'use client'

import { useEffect, useState } from 'react'
import { CatalogAPI } from '@/services/catalogApi'
import type { Upsell } from '@/types/catalog'

export function ProductUpsells({ productId }: { productId: string }) {
  const [upsells, setUpsells] = useState<Upsell[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    CatalogAPI.getProductUpsells(productId, 4)
      .then(setUpsells)
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) return <div>Chargement...</div>

  return (
    <section className="my-8">
      <h2 className="text-2xl font-bold mb-4">Produits recommandés</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {upsells.map(upsell => (
          <div key={upsell.id} className="border rounded-lg p-4">
            <img 
              src={upsell.image_url} 
              alt={upsell.name}
              className="w-full h-48 object-cover rounded"
            />
            <h3 className="font-semibold mt-2">{upsell.name}</h3>
            <p className="text-sm text-gray-600">{upsell.short_description}</p>
            <div className="mt-2">
              <span className="font-bold">
                {(upsell.monthly_price / 100).toFixed(2)} €/mois
              </span>
              {upsell.source === 'manual' && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Recommandé
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

## Support

Pour toute question ou problème avec l'API, contactez :

- **Email** : hello@itakecare.be
- **Téléphone** : +32 (0)71 49 16 85

---

## Changelog

### Version 1.0.0 (Janvier 2025)
- ✅ Lancement initial de l'API
- ✅ Endpoints produits, catégories, marques
- ✅ Système d'upsells manuels + automatiques
- ✅ Données environnementales CO2
- ✅ Personnalisations visuelles
