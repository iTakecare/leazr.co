# Catalogue API Reference

API publique pour accéder au catalogue iTakecare via Edge Functions Supabase.

## Configuration

Base URL: `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api`

Tous les endpoints nécessitent un header `x-api-key` avec une clé API valide.

## Endpoints

### GET /v1/{companySlug}/company

Retourne les informations de l'entreprise.

**Réponse :**
```json
{
  "company": {
    "id": "uuid",
    "name": "iTakecare",
    "slug": "itakecare",
    "logo_url": "https://...",
    "primary_color": "#3b82f6",
    "secondary_color": "#64748b",
    "accent_color": "#8b5cf6"
  }
}
```

---

### GET /v1/{companySlug}/products

Retourne la liste des produits avec filtres optionnels.

**Paramètres de requête :**
- `search` (string) - Recherche textuelle
- `category` (string) - Filtrer par catégorie
- `brand` (string) - Filtrer par marque
- `minPrice` (number) - Prix minimum
- `maxPrice` (number) - Prix maximum
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Nombre de résultats par page (défaut: 50, max: 100)

**Réponse :**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "MacBook Pro 14\"",
      "slug": "macbook-pro-14",
      "price": 2499,
      "monthly_price": 99.96,
      "image_url": "https://...",
      "brand": "Apple",
      "category": "Ordinateur portable",
      "description": "...",
      "active": true
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 1
}
```

---

### GET /v1/{companySlug}/products/{productId}

Retourne un produit spécifique par son ID ou slug.

**Réponse :**
```json
{
  "product": {
    "id": "uuid",
    "name": "MacBook Pro 14\"",
    "slug": "macbook-pro-14",
    "price": 2499,
    "monthly_price": 99.96,
    "image_url": "https://...",
    "brand": "Apple",
    "category": "Ordinateur portable",
    "description": "Description complète...",
    "specifications": {
      "processor": "Apple M3 Pro",
      "ram": "18 GB",
      "storage": "512 GB SSD"
    },
    "has_variants": true,
    "variants": [...]
  }
}
```

---

### GET /v1/{companySlug}/categories

Retourne toutes les catégories avec leurs types enrichis et données environnementales.

**Réponse :**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "macbook",
      "translation": "MacBook",
      "type": {
        "value": "device",
        "label": "Appareil",
        "icon": "📱",
        "bg_color": "bg-blue-100",
        "text_color": "text-blue-800"
      },
      "description": "Ordinateurs portables Apple MacBook",
      "co2_savings_kg": 150,
      "environmental_impact": {
        "co2_savings_kg": 150,
        "carbon_footprint_reduction_percentage": 45,
        "energy_savings_kwh": 200,
        "water_savings_liters": 500,
        "waste_reduction_kg": 5,
        "source_url": "https://impactco2.fr",
        "last_updated": "2025-01-20T10:00:00Z"
      }
    }
  ]
}
```

**Changements par rapport à la version précédente :**
- ✅ `type` est maintenant un objet `CategoryType` au lieu d'une simple string
- ✅ Inclut les propriétés visuelles (`icon`, `bg_color`, `text_color`) pour l'affichage
- ✅ Données environnementales enrichies avec tous les indicateurs

---

### GET /v1/{companySlug}/category-types

**NOUVEAU** - Retourne tous les types de catégories actifs avec leurs propriétés visuelles.

**Réponse :**
```json
{
  "category_types": [
    {
      "value": "device",
      "label": "Appareil",
      "icon": "📱",
      "bg_color": "bg-blue-100",
      "text_color": "text-blue-800",
      "display_order": 1
    },
    {
      "value": "accessory",
      "label": "Accessoire",
      "icon": "🔌",
      "bg_color": "bg-green-100",
      "text_color": "text-green-800",
      "display_order": 2
    },
    {
      "value": "peripheral",
      "label": "Périphérique",
      "icon": "🖨️",
      "bg_color": "bg-purple-100",
      "text_color": "text-purple-800",
      "display_order": 3
    }
  ]
}
```

**Utilisation :**
- Afficher des badges de catégorie avec les bonnes couleurs et icônes
- Construire des filtres de recherche dynamiques
- Valider les types de catégories côté client

---

### GET /v1/{companySlug}/compatibilities

**NOUVEAU** - Retourne les compatibilités entre types de catégories (relations parent-enfant).

**Réponse :**
```json
{
  "compatibilities": {
    "device": ["accessory", "peripheral", "software"],
    "furniture": ["accessory"],
    "software": []
  }
}
```

**Structure :**
- Clé : Type de catégorie parent
- Valeur : Array des types de catégories compatibles (enfants)

**Utilisation :**
- Afficher des suggestions de produits complémentaires
- Créer des recommandations intelligentes ("Les clients qui achètent X achètent aussi Y")
- Construire des packs de produits cohérents

---

### GET /v1/{companySlug}/brands

Retourne la liste des marques disponibles.

**Réponse :**
```json
{
  "brands": [
    {
      "name": "apple",
      "translation": "Apple",
      "website_url": "https://apple.com"
    }
  ]
}
```

---

### POST /v1/{companySlug}/cart/submit

Soumet un panier pour créer un devis ou une commande.

**Corps de la requête :**
```json
{
  "type": "quote",
  "items": [
    {
      "productId": "uuid",
      "quantity": 1,
      "duration": 36
    }
  ],
  "customerInfo": {
    "email": "client@example.com",
    "name": "Jean Dupont",
    "company": "ACME Corp",
    "phone": "+32 471 12 34 56"
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "id": "uuid",
  "message": "Demande de devis créée avec succès"
}
```

---

## Codes d'erreur

- `400` - Requête invalide (paramètres manquants ou incorrects)
- `401` - API key manquante ou invalide
- `404` - Ressource non trouvée
- `429` - Trop de requêtes (rate limit dépassé)
- `500` - Erreur serveur interne

## Rate Limiting

- **100 requêtes par heure** par adresse IP
- Header `X-RateLimit-Remaining` retourné avec chaque requête
- Code `429` retourné si limite dépassée

## Exemples d'utilisation

### JavaScript / TypeScript

```typescript
import { ApiService } from './api-service';

const api = new ApiService('itakecare');

// Récupérer les types de catégories
const { category_types } = await api.getCategoryTypes();

// Récupérer les catégories avec types enrichis
const { categories } = await api.getCategories('itakecare');

// Afficher un badge de catégorie
categories.forEach(cat => {
  console.log(`
    <span class="${cat.type.bg_color} ${cat.type.text_color} px-2 py-1 rounded">
      ${cat.type.icon} ${cat.type.label}
    </span>
  `);
});

// Récupérer les compatibilités
const { compatibilities } = await api.getCategoryCompatibilities();

// Suggérer des accessoires pour un device
if (selectedCategory.type.value === 'device') {
  const compatibleTypes = compatibilities['device']; // ['accessory', 'peripheral']
  // Afficher des produits de ces types
}
```

### cURL

```bash
# Récupérer les types de catégories
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/category-types" \
  -H "x-api-key: YOUR_API_KEY"

# Récupérer les catégories
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/categories" \
  -H "x-api-key: YOUR_API_KEY"

# Récupérer les compatibilités
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/compatibilities" \
  -H "x-api-key: YOUR_API_KEY"

# Rechercher des produits par catégorie
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products?category=macbook&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Changelog

### v1.1.0 (2025-01-20)
- ✅ **NOUVEAU:** Endpoint `/category-types` pour récupérer les types dynamiques
- ✅ **NOUVEAU:** Endpoint `/compatibilities` pour les relations entre types
- ✅ **MODIFIÉ:** `/categories` retourne maintenant des objets `type` enrichis au lieu de simples strings
- ✅ Ajout de contrainte FK `categories.type` → `category_types.value` pour l'intégrité des données
- ✅ Amélioration des performances avec index sur les jointures

### v1.0.0
- Version initiale
