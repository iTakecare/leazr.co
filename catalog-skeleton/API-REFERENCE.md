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

### GET /v1/{companySlug}/products/{productId}/upsells

**NOUVEAU v1.2** - Retourne les produits upsells recommandés pour un produit spécifique.

**Système de cohabitation :** Combine upsells manuels (sélectionnés par l'administrateur) + suggestions automatiques (basées sur compatibilités de catégories).

**Ordre de priorité :** Upsells manuels d'abord (triés par `priority`), puis suggestions automatiques (triées par prix).

**Paramètres de requête :**
- `limit` (number, optionnel) - Nombre maximum d'upsells à retourner (défaut: 10)

**Réponse :**
```json
{
  "upsells": [
    {
      "id": "uuid",
      "name": "Magic Mouse 2",
      "slug": "magic-mouse-2",
      "price": 89,
      "monthly_price": 3.15,
      "image_url": "https://...",
      "brand": "Apple",
      "category": "Souris",
      "short_description": "Souris sans fil rechargeable",
      "source": "manual",
      "priority": 10,
      "upsell_reason": "Sélectionné manuellement par l'administrateur"
    },
    {
      "id": "uuid",
      "name": "Magic Keyboard",
      "slug": "magic-keyboard",
      "price": 129,
      "monthly_price": 4.55,
      "image_url": "https://...",
      "brand": "Apple",
      "category": "Clavier",
      "source": "auto",
      "priority": null,
      "upsell_reason": "Suggéré automatiquement - Compatible avec Ordinateur portable"
    }
  ],
  "total": 2,
  "manual_count": 1,
  "auto_count": 1
}
```

**Comment fonctionnent les upsells ?**

1. **Upsells manuels** (priorité haute)
   - Sélectionnés explicitement par l'administrateur dans la fiche produit
   - Stockés dans `product_upsells` avec `source: 'manual'`
   - Ordre défini par le champ `priority` (drag & drop dans l'interface admin)
   - Affichés en premier dans la liste

2. **Suggestions automatiques** (priorité normale)
   - Générées dynamiquement selon les compatibilités de catégories
   - Basées sur `category_type_compatibilities` et `category_specific_links`
   - Affichées après les upsells manuels
   - Triées par prix croissant

3. **Logique de fusion**
   - Les upsells manuels sont toujours affichés en premier
   - Les suggestions auto complètent la liste (si limite pas atteinte)
   - Pas de doublons : si un produit est manuel ET suggéré auto, seule la version manuelle apparaît

**Bonnes pratiques :**

- **Affichage :** Limiter à 4-6 upsells sur la page produit (paramètre `limit`)
- **Badges :** Upsells manuels avec badge "Recommandé par nos experts", suggestions auto avec "Compatible" ou "Souvent acheté avec"
- **Raison :** Utiliser `upsell_reason` pour expliquer la recommandation
- **Prix :** Afficher le `monthly_price` pour maximiser l'accessibilité
- **Performance :** Cacher les résultats côté client (5 minutes recommandé)
- **Analytics :** Tracker les clics et conversions par `source` pour optimisation

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

// Récupérer les upsells pour un produit
async function getProductUpsells(
  companySlug: string, 
  productId: string, 
  limit: number = 10
): Promise<UpsellsResponse> {
  const response = await fetch(
    `${BASE_URL}/v1/${companySlug}/products/${productId}/upsells?limit=${limit}`,
    { headers: { 'x-api-key': API_KEY }}
  );
  
  if (!response.ok) throw new Error('Failed to fetch upsells');
  return response.json();
}

// Afficher les upsells sur la page produit
const { upsells } = await getProductUpsells('itakecare', productId, 6);

// Section "Accessoires recommandés" (upsells manuels)
const manualUpsells = upsells.filter(u => u.source === 'manual');
manualUpsells.forEach(upsell => {
  renderUpsellCard(upsell, 'Recommandé par nos experts');
});

// Section "Vous aimerez aussi" (suggestions auto)
const autoUpsells = upsells.filter(u => u.source === 'auto');
autoUpsells.forEach(upsell => {
  renderUpsellCard(upsell, 'Compatible');
});

// Tracker le taux de conversion
analytics.track('upsell_displayed', {
  product_id: productId,
  upsell_source: upsell.source,
  upsell_priority: upsell.priority
});

// Interface TypeScript pour les upsells
interface ProductUpsell {
  id: string;
  name: string;
  slug: string;
  price: number;
  monthly_price: number;
  image_url?: string;
  brand?: string;
  category?: string;
  short_description?: string;
  source: 'manual' | 'auto';
  priority?: number;
  upsell_reason?: string;
}

interface UpsellsResponse {
  upsells: ProductUpsell[];
  total: number;
  manual_count: number;
  auto_count: number;
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

# Récupérer les upsells pour un MacBook Pro
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/550e8400-e29b-41d4-a716-446655440000/upsells?limit=5" \
  -H "x-api-key: YOUR_API_KEY"

# Rechercher des produits par catégorie
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products?category=macbook&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Changelog

### v1.2.0 (2025-11-20)

#### ✅ Nouveautés - Système d'Upsells Produits

- **Nouvel endpoint :** `GET /v1/{companySlug}/products/{productId}/upsells`
- **Système hybride :** Combine upsells manuels (sélectionnés par admin) + suggestions automatiques (compatibilités)
- **Personnalisation :** Les administrateurs peuvent définir des upsells spécifiques par produit
- **Priorités :** Ordre d'affichage contrôlé via drag & drop dans l'interface admin
- **Intelligence :** Suggestions auto basées sur types de catégories compatibles

#### 🔧 Améliorations techniques

- Table `product_upsells` pour stocker les relations manuelles
- Champ `source` ('manual' | 'auto') pour distinguer l'origine
- Champ `priority` pour l'ordre d'affichage des upsells manuels
- Déduplication automatique (pas de doublons entre manuel et auto)

#### 📊 Impact business

- **Augmentation du panier moyen :** Suggestions pertinentes et personnalisées
- **Flexibilité marketing :** Contrôle total sur les produits recommandés
- **Analytics :** Tracking possible entre upsells manuels vs automatiques

### v1.1.0 (2025-01-20)
- ✅ **NOUVEAU:** Endpoint `/category-types` pour récupérer les types dynamiques
- ✅ **NOUVEAU:** Endpoint `/compatibilities` pour les relations entre types
- ✅ **MODIFIÉ:** `/categories` retourne maintenant des objets `type` enrichis au lieu de simples strings
- ✅ Ajout de contrainte FK `categories.type` → `category_types.value` pour l'intégrité des données
- ✅ Amélioration des performances avec index sur les jointures

### v1.0.0
- Version initiale
