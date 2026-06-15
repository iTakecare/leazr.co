# iTakecare - Documentation API Complète

**Version :** 2026.1  
**Dernière mise à jour :** 14 juin 2026  
**Base URL :** `https://cifbetjefyfocafanlhv.supabase.co/functions/v1`

---

## Table des matières

1. [Introduction](#introduction)
2. [Configuration et Authentification](#configuration-et-authentification)
3. [API Catalogue](#api-catalogue)
4. [API Product Request](#api-product-request)
   - [Identification du Type de Demande](#identification-du-type-de-demande-via-source)
   - [Packs Personnalisés](#packs-personnalisés)
   - [Consentements RGPD (appel IA / WhatsApp / SMS)](#consentements-rgpd-voice_consent--messaging_consent)
5. [API Environmental](#api-environmental)
6. [Structures de Données](#structures-de-données)
7. [Gestion des Erreurs](#gestion-des-erreurs)
8. [Exemples de Code](#exemples-de-code)
9. [Rate Limiting et Bonnes Pratiques](#rate-limiting-et-bonnes-pratiques)
10. [Changelog](#changelog)

---

## Introduction

L'écosystème iTakecare API offre trois APIs complémentaires pour intégrer le catalogue de produits reconditionnés, la soumission de demandes de devis, et les données environnementales dans vos applications.

### Trois APIs Principales

1. **Catalog API** : Accès au catalogue de produits, catégories, marques, et upsells
2. **Product Request API** : Soumission automatisée de demandes d'équipement avec création de clients
3. **Environmental API** : Données d'impact CO2 et équivalences environnementales

### Cas d'Usage

- **Site web public** : Afficher le catalogue, panier, calcul CO2
- **Application mobile** : Accès catalogue complet avec filtres avancés
- **Outils internes** : Automatisation de la création de devis
- **Intégrations tierces** : Connexion avec CRM, ERP, plateformes e-commerce

---

## Configuration et Authentification

### Base URL

```
https://cifbetjefyfocafanlhv.supabase.co/functions/v1
```

### Authentification - Catalog API

Toutes les requêtes vers l'API Catalogue nécessitent une clé API :

```http
x-api-key: YOUR_API_KEY
```

**Obtenir une clé API :** Contactez iTakecare à hello@itakecare.be

### Authentification - Product Request API

L'API Product Request est publique et ne nécessite pas d'authentification. La détection de l'entreprise se fait automatiquement via le header `referer`.

### Authentification - Environmental API

Utilise la même authentification que l'API Catalogue (header `x-api-key`).

### Format des Réponses

- **Content-Type :** `application/json`
- **Encodage :** UTF-8
- **CORS :** Activé sur tous les endpoints

---

## API Catalogue

### Base Path

```
/catalog-api/v1/{companySlug}
```

### Endpoints Disponibles

| Méthode | Endpoint                        | Description                     |
| ------- | ------------------------------- | ------------------------------- |
| GET     | `/company`                      | Informations entreprise         |
| GET     | `/products`                     | Liste des produits avec filtres |
| GET     | `/products/{productId}`         | Détail d'un produit             |
| GET     | `/products/{productId}/upsells` | Upsells manuels pour un produit |
| GET     | `/products/{productId}/co2`     | Données CO2 d'un produit        |
| GET     | `/categories`                   | Liste des catégories            |
| GET     | `/brands`                       | Liste des marques               |
| GET     | `/packs`                        | Liste des packs actifs          |
| GET     | `/packs/{packId}`               | Détail d'un pack                |
| GET     | `/customizations`               | Personnalisations visuelles     |
| GET     | `/search`                       | Recherche produits              |
| POST    | `/cart/submit`                  | Soumettre un panier             |

---

### GET /company

Récupère les informations de l'entreprise.

**URL :** `/catalog-api/v1/{companySlug}/company`

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

### GET /products

Liste paginée des produits avec filtres optionnels.

**URL :** `/catalog-api/v1/{companySlug}/products`

**Paramètres de requête :**

| Paramètre  | Type   | Description                  | Défaut |
| ---------- | ------ | ---------------------------- | ------ |
| `search`   | string | Recherche textuelle          | -      |
| `category` | string | ID de catégorie              | -      |
| `brand`    | string | Nom de la marque             | -      |
| `minPrice` | number | Prix minimum (€)             | -      |
| `maxPrice` | number | Prix maximum (€)             | -      |
| `page`     | number | Numéro de page               | 1      |
| `limit`    | number | Résultats par page (max 100) | 50     |

**Exemple de requête :**

```bash
GET /catalog-api/v1/itakecare/products?category=laptop&minPrice=500&limit=20
```

**Réponse :**

```json
{
  "products": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "MacBook Pro 14\"",
      "slug": "macbook-pro-14",
      "price": 2499,
      "monthly_price": 99.96,
      "image_url": "https://...",
      "brand": "Apple",
      "category": "Ordinateur portable",
      "description": "MacBook Pro reconditionné...",
      "short_description": "Puissance et efficacité",
      "active": true,
      "has_variants": true,
      "variants_count": 3
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

---

### GET /products/{productId}

Détail complet d'un produit spécifique (par ID ou slug).

**URL :** `/catalog-api/v1/{companySlug}/products/{productId}`

**Réponse :**

```json
{
  "product": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "MacBook Pro 14\"",
    "slug": "macbook-pro-14",
    "price": 2499,
    "monthly_price": 99.96,
    "image_url": "https://...",
    "brand": "Apple",
    "category": "Ordinateur portable",
    "description": "Description complète...",
    "active": true,
    "has_variants": true,
    "variants": [
      {
        "id": "variant-1",
        "name": "M3 Pro / 512GB / 18GB RAM",
        "price": 2499,
        "monthly_price": 99.96,
        "image_url": "https://...",
        "attributes": {
          "processor": "M3 Pro",
          "storage": "512GB",
          "ram": "18GB"
        },
        "active": true
      }
    ],
    "variation_attributes": {
      "processor": ["M3", "M3 Pro", "M3 Max"],
      "storage": ["512GB", "1TB"],
      "ram": ["18GB", "36GB"]
    },
    "specifications": {
      "screen": "14.2 pouces Liquid Retina XDR",
      "graphics": "GPU jusqu'à 18 cœurs",
      "battery": "Jusqu'à 17 heures"
    }
  }
}
```

---

### GET /products/{productId}/upsells

⭐ **Nouveauté v2024.3** - Récupère les upsells **manuellement configurés** pour un produit.

**URL :** `/catalog-api/v1/{companySlug}/products/{productId}/upsells`

**Paramètres de requête :**

| Paramètre | Type   | Description              | Défaut |
| --------- | ------ | ------------------------ | ------ |
| `limit`   | number | Nombre maximum d'upsells | 10     |

**Système d'Upsells iTakecare :**

Les upsells sont **100% manuels** : les administrateurs sélectionnent directement dans l'interface admin quels produits doivent être suggérés pour chaque produit. Il n'y a **aucune suggestion automatique** basée sur les catégories.

Si un produit n'a aucun upsell configuré, l'API retourne des produits de la même catégorie comme fallback.

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
      "priority": 10
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
      "source": "manual",
      "priority": 5
    }
  ],
  "total": 2,
  "manual_count": 2,
  "auto_count": 0
}
```

**Champs :**

- `source` : Toujours `"manual"` pour les upsells configurés par admin
- `priority` : Ordre d'affichage (plus élevé = affiché en premier)
- `manual_count` : Nombre d'upsells configurés manuellement
- `auto_count` : Nombre de suggestions de fallback (même catégorie)

**Bonnes pratiques :**

- Limiter à 4-6 upsells sur la page produit (`?limit=6`)
- Afficher un badge "Recommandé par nos experts" pour les upsells manuels
- Cacher les résultats côté client (5 minutes recommandé)
- Tracker les clics pour optimiser les recommandations

---

### GET /categories

Liste des catégories avec données environnementales.

**URL :** `/catalog-api/v1/{companySlug}/categories`

**Réponse :**

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "macbook",
      "translation": "MacBook",
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

---

### GET /brands

Liste des marques disponibles.

**URL :** `/catalog-api/v1/{companySlug}/brands`

**Réponse :**

```json
{
  "brands": [
    {
      "name": "apple",
      "translation": "Apple",
      "website_url": "https://apple.com"
    },
    {
      "name": "dell",
      "translation": "Dell",
      "website_url": "https://dell.com"
    }
  ]
}
```

---

### GET /customizations

Personnalisations visuelles de l'entreprise.

**URL :** `/catalog-api/v1/{companySlug}/customizations`

**Réponse :**

```json
{
  "customizations": {
    "primary_color": "#3b82f6",
    "secondary_color": "#64748b",
    "accent_color": "#8b5cf6",
    "logo_url": "https://...",
    "header_enabled": true,
    "header_title": "Bienvenue sur notre catalogue",
    "header_description": "Découvrez nos équipements reconditionnés"
  }
}
```

---

### POST /cart/submit

Soumet un panier pour créer une demande de devis.

**URL :** `/catalog-api/v1/{companySlug}/cart/submit`

**Body :**

```json
{
  "type": "quote",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
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

**Réponse succès :**

```json
{
  "success": true,
  "id": "uuid",
  "message": "Demande de devis créée avec succès"
}
```

---

### 🎁 GET /packs

Récupère la liste des packs de produits actifs.

**URL :** `/catalog-api/v1/{companySlug}/packs`

**Paramètres Query :**  
Aucun. Retourne tous les packs actifs, avec les featured en premier.

**Réponse Success (200) :**

```json
{
  "packs": [
    {
      "id": "uuid",
      "name": "Pack Bureau Pro",
      "description": "Pack complet pour équiper un bureau professionnel",
      "image_url": "https://...",
      "is_active": true,
      "is_featured": true,
      "total_monthly_price": 150.00,
      "pack_monthly_price": 135.00,
      "pack_promo_price": 120.00,
      "promo_active": true,
      "promo_valid_from": "2025-01-01T00:00:00Z",
      "promo_valid_to": "2025-12-31T23:59:59Z",
      "items": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "quantity": 1,
          "unit_monthly_price": 80.00,
          "position": 0,
          "product": {
            "id": "uuid",
            "name": "MacBook Pro 14\"",
            "slug": "macbook-pro-14",
            "image_url": "https://...",
            "brand_name": "Apple",
            "category_name": "Laptop"
          }
        },
        {
          "id": "uuid",
          "product_id": "uuid",
          "quantity": 1,
          "unit_monthly_price": 55.00,
          "position": 1,
          "product": {
            "id": "uuid",
            "name": "iPhone 13 Pro",
            "slug": "iphone-13-pro",
            "image_url": "https://...",
            "brand_name": "Apple",
            "category_name": "Smartphone"
          }
        }
      ],
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Exemple cURL :**

```bash
curl -X GET \
  'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/packs' \
  -H 'x-api-key: YOUR_API_KEY'
```

---

### 🎁 GET /packs/{packId}

Récupère le détail complet d'un pack spécifique.

**URL :** `/catalog-api/v1/{companySlug}/packs/{packId}`

**Paramètres Path :**

- `packId` (string, required) : UUID du pack

**Réponse Success (200) :**

Structure identique à `/packs` mais pour un seul pack avec tous les détails des produits incluant descriptions, spécifications et variantes.

**Réponse Error (404) :**

```json
{
  "error": "Pack not found"
}
```

**Exemple JavaScript :**

```typescript
const response = await fetch(
  `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/packs/${packId}`,
  {
    headers: {
      'x-api-key': 'YOUR_API_KEY'
    }
  }
)
const { pack } = await response.json()

// Calculer le prix effectif (promo > custom > total)
const effectivePrice = pack.promo_active && pack.pack_promo_price
  ? pack.pack_promo_price
  : pack.pack_monthly_price || pack.total_monthly_price

console.log(`Pack: ${pack.name} - ${effectivePrice}€/mois`)
console.log(`Contient ${pack.items.length} produits`)
```

---

### 💡 Logique des prix des packs

Les packs ont trois niveaux de prix :

1. **`total_monthly_price`** : Somme des prix individuels des produits
2. **`pack_monthly_price`** : Prix personnalisé du pack (remise pack)
3. **`pack_promo_price`** : Prix promotionnel temporaire

**Ordre de priorité pour l'affichage :**

```typescript
function getEffectivePackPrice(pack) {
  // 1. Si promo active et dans la période de validité
  if (pack.promo_active && pack.pack_promo_price) {
    const now = new Date()
    const validFrom = pack.promo_valid_from ? new Date(pack.promo_valid_from) : null
    const validTo = pack.promo_valid_to ? new Date(pack.promo_valid_to) : null

    if ((!validFrom || now >= validFrom) && (!validTo || now <= validTo)) {
      return pack.pack_promo_price
    }
  }

  // 2. Sinon prix personnalisé du pack
  if (pack.pack_monthly_price > 0) {
    return pack.pack_monthly_price
  }

  // 3. Sinon somme des prix individuels
  return pack.total_monthly_price
}
```

---

## API Product Request

### Endpoint Principal

**POST** `/create-product-request`

Cette API permet la création automatisée de demandes d'équipement complètes avec :

- Création automatique du client dans la base de données
- Génération de l'offre avec calculs financiers
- Création optionnelle d'un compte utilisateur
- Envoi d'emails de confirmation

### URL Complète

```
https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request
```

### Authentification

**Publique** - Aucune authentification requise. La détection de l'entreprise se fait automatiquement via le header `referer`.

### Formats de Requête Acceptés

L'API accepte **deux formats de requête** pour garantir la rétrocompatibilité :

#### Format 1 : Ancien Format (client)

Le format historique avec un objet `client` simple.

#### Format 2 : Nouveau Format (contact_info + company_info)

Le format étendu utilisé par iTakecare avec des informations détaillées.

**Important :** Vous devez fournir **soit** le format 1 (`client`), **soit** le format 2 (`contact_info` + `company_info`). Les deux formats sont mutuellement exclusifs mais l'un des deux est **obligatoire**.

### Structure de la Requête

**Headers :**

```http
Content-Type: application/json
```

#### Exemple Format 1 (Ancien - avec `client`)

```json
{
  "products": [
    {
      "product_id": "uuid",
      "variant_id": "uuid (optionnel)",
      "quantity": 1,
      "unit_price": 49.99
    }
  ],
  "client": {
    "name": "Jean Dupont",
    "email": "jean.dupont@exemple.be",
    "company": "Exemple SPRL",
    "phone": "+32470123456"
  }
}
```

#### Exemple Format 2 (Nouveau - avec `contact_info` + `company_info`)

```json
{
  "contact_info": {
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@example.com",
    "phone": "+32 2 123 45 67"
  },
  "company_info": {
    "company_name": "Ma Société SPRL",
    "vat_number": "BE0123456789",
    "address": "Rue de la Paix 123",
    "city": "Bruxelles",
    "postal_code": "1000",
    "country": "BE"
  },
  "delivery_info": {
    "address": "Rue de Livraison 456",
    "city": "Liège",
    "postal_code": "4000",
    "country": "BE"
  },
  "products": [
    {
      "product_name": "MacBook Pro 14\"",
      "variant_name": "M3 Pro - 512GB",
      "product_id": "uuid-product-id",
      "variant_id": "uuid-variant-id",
      "quantity": 2,
      "duration": 36,
      "unit_price": 45.50,
      "total_price": 1800.00
    }
  ],
  "create_client_account": true,
  "notes": "Demande urgente pour le département IT",
  "company_id": "optional-company-uuid",
  "voice_consent": true,
  "messaging_consent": true
}
```

### Champs Requis

**Contact Info (Obligatoire) :**

- `email` : Email du contact principal
- `first_name` OU `last_name` : Au moins un nom

**Company Info (Obligatoire) :**

- `company_name` : Nom de l'entreprise cliente

**Products (Obligatoire) :**

- `product_id` (string, obligatoire) : ID du produit dans la base Leazr
- `variant_id` (string, optionnel) : ID de la variante si applicable
- `quantity` (number, défaut: 1) : Quantité commandée
- `unit_price` (number, optionnel) : **Mensualité TOTALE** pour ce produit (déjà × quantité × réduction pack)
- `pack_id` (string, optionnel) : ID du pack personnalisé auquel appartient le produit
- `pack_discount_percentage` (number, optionnel) : Pourcentage de réduction appliqué par le pack (2-5%)

**⚠️ Important sur `unit_price`** :  
Ce champ contient la **mensualité totale** pour le produit (pas unitaire). iTakecare calcule : `mensualité_unitaire × quantité × (1 - réduction_pack)`. Leazr divise ensuite par la quantité pour obtenir la mensualité unitaire à stocker en base.

> **📊 Note sur le coefficient** : Le coefficient de financement utilisé par défaut est **3.53** (Grenke Lease). Ce coefficient peut varier selon le montant financé grâce aux tranches définies dans la configuration du leaser.

**Champs Optionnels :**

- `create_client_account` : Créer un compte utilisateur (défaut: false)
- `notes` : Remarques additionnelles
- `delivery_info` : Adresse de livraison différente
- `voice_consent` (boolean, défaut: false) : Consentement RGPD à être recontacté par **téléphone, y compris par l'assistant vocal IA (Alex)**
- `messaging_consent` (boolean, défaut: false) : Consentement RGPD à être recontacté par **WhatsApp / SMS**

### Consentements RGPD (`voice_consent` / `messaging_consent`)

Ces deux champs **booléens à la racine de la requête** captent le consentement du contact à être recontacté, selon la finalité. Ils sont **optionnels** mais **recommandés** : sans consentement, iTakecare ne sollicitera pas le contact par le canal concerné.

- Envoyer `true` **uniquement** si l'internaute a coché la case de consentement correspondante sur le formulaire. Ne jamais pré-cocher (RGPD : consentement libre et explicite).
- `voice_consent: true` → autorise les **appels téléphoniques et l'agent vocal IA**.
- `messaging_consent: true` → autorise les **messages WhatsApp et SMS**.
- Les deux peuvent être regroupés sous une **seule case** côté site (« J'accepte d'être recontacté par téléphone, y compris assistant vocal, WhatsApp ou SMS ») ou présentés en **deux cases distinctes** pour un consentement granulaire.

**Traitement côté iTakecare :** à la première demande où `true` est reçu, la date de consentement est **horodatée une seule fois** sur la fiche client (`voice_consent_given_at`, `messaging_opt_in_at`) — la date d'origine est préservée lors des demandes suivantes (la loi retient la date du **premier** consentement). L'absence ou l'échec d'enregistrement du consentement **ne bloque jamais** la création de la demande.

```json
{
  "contact_info": { "first_name": "Jean", "last_name": "Dupont", "email": "jean.dupont@example.com", "phone": "+32 470 12 34 56" },
  "company_info": { "company_name": "Ma Société SPRL" },
  "products": [ { "product_id": "uuid", "quantity": 1, "unit_price": 49.99 } ],
  "voice_consent": true,
  "messaging_consent": true
}
```

### Calculs Financiers

#### Par équipement

1. **Prix d'achat unitaire** :
   - **TOUJOURS** récupéré depuis la base de données Leazr
   - Recherche par priorité : `product_variant_prices` puis `products`
   - Si produit non trouvé : nom = "Produit inconnu", prix = 0

2. **Mensualité totale** :
   - Reçue dans `unit_price` (déjà × quantité × réduction pack)
   - Exemple : Magic Mouse × 3 avec -5% = `3.95 × 3 × 0.95 = 11.25€`

3. **Mensualité unitaire** :

   ```
   monthly_payment = unit_price / quantity
   ```

4. **Prix de vente unitaire** :

   ```
   selling_price = (monthly_payment × 100) / coefficient
   ```

5. **Marge individuelle** :
   ```
   margin (%) = ((selling_price - purchase_price) / purchase_price) × 100
   ```

#### Totaux de l'offre

- **Total prix d'achat** (`amount`) : Somme de `purchase_price × quantity` pour chaque équipement
- **Total mensualités** (`monthly_payment`) : Somme des `unit_price` (mensualités totales déjà réduites)
- **Total prix de vente** (`financed_amount`) : `(monthly_payment × 100) / coefficient`
- **Marge globale** (`margin`) : `((financed_amount - amount) / amount) × 100`

**Exemple de calcul** :

```javascript
// Données reçues (Magic Mouse × 3 avec -5% pack)
const product = {
  product_id: "abc123",
  quantity: 3,
  unit_price: 11.25  // Mensualité TOTALE (3.95 × 3 × 0.95)
};

// Recherche dans DB Leazr
const dbPrice = 123.00;  // Prix d'achat unitaire

// Calculs par équipement
const monthlyPrice = 11.25 / 3 = 3.75;                    // Mensualité unitaire
const sellingPrice = (3.75 * 100) / 3.53 = 106.23;        // Prix vente unitaire
const margin = ((106.23 - 123) / 123) * 100 = -13.61%;    // Marge négative (réduction)

// Totaux pour cet équipement
const totalPurchasePrice = 123 * 3 = 369.00;
const totalSellingPrice = 106.23 * 3 = 318.69;
const totalMonthly = 11.25;  // Déjà le total
```

]
}

````

**Traitement par l'API :**

1. **Prix d'achat** : DB Leazr `product_variant_prices` → `1800€`
2. **Prix mensuel** : iTakecare `unit_price` → `45.50€`
3. **Calculs** :
   - `amount` = 1800€ × 2 = `3600€`
   - `monthly_payment` = 45.50€ × 2 = `91€`
   - `financed_amount` = (91 × 100) / 3.53 = `2578.47€`
   - `margin` = ((2578.47 - 3600) / 3600) × 100 = `-28.38%`

### Réponse de l'API

**Succès (200) :**

```json
{
  "id": "uuid-offer-id",
  "client_id": "uuid-client-id",
  "client_name": "Jean Dupont",
  "client_email": "jean.dupont@example.com",
  "equipment_description": "MacBook Pro 14\" - M3 Pro - 512GB (x2)",
  "amount": 2700.00,
  "monthly_payment": 70.50,
  "financed_amount": 1997.17,
  "coefficient": 3.53,
  "margin": -26.03,
  "type": "client_request",
  "source": "custom_pack",
  "workflow_status": "requested",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "packs_summary": [
    {
      "pack_name": "Pack Personnalisé - 1",
      "discount_percentage": 5,
      "monthly_savings": 10.20,
      "original_monthly_total": 203.92,
      "discounted_monthly_total": 193.72
    }
  ]
}
```

### Identification du Type de Demande via `source`

⭐ **Nouveauté v2025.7** - Différenciation automatique entre packs personnalisés et commandes catalogue.

Le champ `source` identifie automatiquement l'origine de chaque demande :

| Valeur        | Description                          |
|---------------|--------------------------------------|
| `custom_pack` | Pack personnalisé (configurateur)    |
| `web_catalog` | Commande catalogue standard          |

**Attribution automatique** : L'API détecte la présence de `packs[]` dans votre requête.

```javascript
// Requête avec packs[] → source = "custom_pack"
// Requête sans packs[] → source = "web_catalog"
```

**Interface Admin Leazr :**
- Badge violet pour packs personnalisés
- Badge bleu ciel pour catalogue
- Filtre dédié par type de source

**Exemples de réponses :**

```json
// Catalogue web
{
  "id": "abc-123",
  "source": "web_catalog",
  "monthly_payment": 45.50,
  "packs_summary": []
}

// Pack personnalisé
{
  "id": "def-456",
  "source": "custom_pack",
  "monthly_payment": 193.72,
  "packs_summary": [...]
}
```

````

### Fonctionnalités Automatiques

#### Création d'Équipements Détaillés

Chaque produit génère :

- Un enregistrement dans `offer_equipment`
- Nom complet : `product_name - variant_name`
- Prix et quantités individuels
- Lien vers les IDs produit/variant

#### Gestion des Comptes Clients

Si `create_client_account: true` :

1. Création automatique d'un compte Supabase Auth
2. Génération d'un lien de définition de mot de passe
3. Email d'activation personnalisé
4. Mise à jour du statut client

#### Envoi d'Emails Automatique

- Templates personnalisables depuis `email_templates`
- Fallback vers template par défaut
- Variables dynamiques remplacées automatiquement
- Support Resend pour l'envoi

### Adresses de Facturation et Livraison

L'API supporte la séparation des adresses :

- **Facturation** : Extraite de `company_info`
- **Livraison** : Extraite de `delivery_info`

Si `delivery_info` est absent ou identique à `company_info`, le système définit automatiquement `delivery_same_as_billing: true`.

---

### Packs Personnalisés

⭐ **Nouveauté v2024.4** - Support complet des packs personnalisés avec réductions progressives.  
🆕 **v2025.7** - Les demandes avec packs sont maintenant automatiquement identifiées via `source: "custom_pack"`

**Important :** Toute demande contenant un tableau `packs[]` sera automatiquement marquée avec `source: "custom_pack"` pour faciliter l'identification et le traitement dans l'interface admin Leazr. Voir la section [Identification du Type de Demande](#identification-du-type-de-demande-via-source) pour plus de détails.

#### Vue d'ensemble

Le configurateur de packs permet aux clients de :

- ✅ Sélectionner plusieurs produits de catégories différentes
- ✅ Bénéficier automatiquement d'une réduction progressive (2% à 5%)
- ✅ Sauvegarder et partager leur configuration
- ✅ Commander le pack avec la réduction appliquée

#### Système de Réductions par Paliers

| Prix mensuel total | Réduction appliquée |
| ------------------ | ------------------- |
| 100,00€ - 110,00€  | -2%                 |
| 110,01€ - 125,00€  | -3%                 |
| 125,01€ - 150,00€  | -4%                 |
| > 150,00€          | -5%                 |

**Conditions** : Minimum 2 produits de 2 catégories différentes.

#### Structure de la Requête - Packs

##### Nouveau champ `packs[]`

```typescript
interface CustomPack {
  custom_pack_id: string;              // UUID du pack (généré frontend)
  pack_name: string;                   // Nom du pack (ex: "Pack Personnalisé - 1")
  discount_percentage: number;         // % de réduction (2, 3, 4, ou 5)
  items: PackItem[];                   // Liste des produits dans le pack
}

interface PackItem {
  product_id: string;                  // UUID du produit
  quantity: number;                    // Quantité commandée
  variant_id?: string;                 // UUID de la variante (si applicable)
}
```

**Exemple JSON :**

```json
{
  "packs": [
    {
      "custom_pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_name": "Pack Personnalisé - 1",
      "discount_percentage": 4,
      "items": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440000",
          "quantity": 2,
          "variant_id": "660e8400-e29b-41d4-a716-446655440111"
        },
        {
          "product_id": "770e8400-e29b-41d4-a716-446655440222",
          "quantity": 1
        }
      ]
    }
  ]
}
```

##### Extension du champ `products[]`

Les produits faisant partie d'un pack incluent deux nouveaux champs optionnels :

```typescript
interface Product {
  // Champs existants...
  product_id: string;
  quantity: number;
  unit_price: number;                  // ⚠️ Prix AVEC réduction appliquée
  total_price: number;

  // ✅ NOUVEAUX CHAMPS
  pack_id?: string;                    // UUID du pack (si fait partie d'un pack)
  pack_discount_percentage?: number;   // % de réduction du pack (2-5)
}
```

##### ⚠️ Point Important : Prix déjà réduit

Le champ `unit_price` inclut **DÉJÀ** la réduction du pack.

**Exemple :**

```
Prix catalogue : 50,00€/mois
Réduction pack : -4%
unit_price envoyé : 48,00€/mois  ← Réduction déjà appliquée
```

#### Exemple Complet avec Pack

##### Scénario

Un client commande un pack personnalisé contenant :

- **2× MacBook Pro 14"** (99,96€/mois × 2 = 199,92€/mois)
- **1× Magic Mouse 2** (4,00€/mois)

**Calculs :**

- Total mensuel avant réduction : **203,92€/mois**
- Réduction applicable : **-5%** (car > 150€)
- Total mensuel après réduction : **193,72€/mois**
- **Économie : 10,20€/mois**

##### Requête JSON

```json
{
  "contact_info": {
    "first_name": "Marie",
    "last_name": "Dubois",
    "email": "marie.dubois@example.com",
    "phone": "+32 471 12 34 56"
  },
  "company_info": {
    "company_name": "Tech Solutions SPRL",
    "vat_number": "BE0987654321",
    "address": "Avenue Louise 123",
    "postal_code": "1050",
    "city": "Bruxelles",
    "country": "BE"
  },
  "delivery_info": {
    "address": "Avenue Louise 123",
    "postal_code": "1050",
    "city": "Bruxelles",
    "country": "BE"
  },
  "products": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "variant_id": "660e8400-e29b-41d4-a716-446655440111",
      "product_name": "MacBook Pro 14\"",
      "variant_name": "M3 Pro - 512GB - 18GB RAM",
      "unit_price": 94.96,
      "total_price": 2399.00,
      "duration": 36,
      "pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_discount_percentage": 5
    },
    {
      "product_id": "770e8400-e29b-41d4-a716-446655440222",
      "quantity": 1,
      "product_name": "Magic Mouse 2",
      "unit_price": 3.80,
      "total_price": 99.00,
      "duration": 36,
      "pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_discount_percentage": 5
    }
  ],
  "packs": [
    {
      "custom_pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_name": "Pack Personnalisé - 1",
      "discount_percentage": 5,
      "items": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440000",
          "quantity": 2,
          "variant_id": "660e8400-e29b-41d4-a716-446655440111"
        },
        {
          "product_id": "770e8400-e29b-41d4-a716-446655440222",
          "quantity": 1
        }
      ]
    }
  ],
  "subtotal": 203.92,
  "total": 193.72,
  "create_client_account": false,
  "notes": "",
  "request_type": "quote"
}
```

##### Réponse avec Pack

```json
{
  "id": "a7b8c9d0-e1f2-3456-7890-abcdef123456",
  "client_id": "c1d2e3f4-a5b6-7890-cdef-123456789abc",
  "client_name": "Marie Dubois",
  "client_email": "marie.dubois@example.com",
  "client_company": "Tech Solutions SPRL",
  "equipment_description": "MacBook Pro 14\" (x2), Magic Mouse 2 (x1)",
  "amount": 4897.00,
  "monthly_payment": 193.72,
  "coefficient": 3.53,
  "financed_amount": 5487.26,
  "margin": 590.26,
  "packs_summary": [
    {
      "pack_name": "Pack Personnalisé - 1",
      "discount_percentage": 5,
      "monthly_savings": 10.20,
      "original_monthly_total": 203.92,
      "discounted_monthly_total": 193.72
    }
  ],
  "created_at": "2025-11-23T15:30:00.000Z"
}
```

#### Points Clés

1. **Le `unit_price` inclut DÉJÀ la réduction** - Ne pas recalculer la réduction côté Leazr
2. **Tous les produits sont dans `products[]`** - Même ceux faisant partie de packs
3. **Le lien produit ↔ pack se fait via `pack_id`** - Permet de regrouper les produits d'un même pack
4. **Les métadonnées du pack sont dans `packs[]`** - Nom, réduction, liste des items
5. **Un panier peut contenir plusieurs packs** - Et également des produits individuels

#### Rétrocompatibilité

Les champs liés aux packs sont **optionnels**. Une commande sans pack fonctionnera exactement comme avant :

```json
{
  "products": [
    {
      "product_id": "550e8400-...",
      "quantity": 1,
      "unit_price": 99.96,
      "total_price": 2499.00
      // Pas de pack_id ni pack_discount_percentage
    }
  ],
  "packs": []  // Tableau vide ou absent
}
```

#### Stockage en Base de Données

##### Table `offer_custom_packs`

Stocke les métadonnées des packs personnalisés.

| Colonne                    | Type    | Description                   |
| -------------------------- | ------- | ----------------------------- |
| `id`                       | UUID    | Identifiant unique du pack    |
| `offer_id`                 | UUID    | Référence à l'offre           |
| `custom_pack_id`           | UUID    | UUID généré par le frontend   |
| `pack_name`                | TEXT    | Nom du pack                   |
| `discount_percentage`      | INTEGER | % de réduction (0-100)        |
| `original_monthly_total`   | NUMERIC | Total mensuel avant réduction |
| `discounted_monthly_total` | NUMERIC | Total mensuel après réduction |
| `monthly_savings`          | NUMERIC | Économie mensuelle            |

##### Extensions de `offer_equipment`

| Colonne                    | Type    | Description                         |
| -------------------------- | ------- | ----------------------------------- |
| `custom_pack_id`           | UUID    | Référence au pack personnalisé      |
| `pack_discount_percentage` | INTEGER | % de réduction du pack              |
| `original_unit_price`      | NUMERIC | Prix unitaire avant réduction       |
| `is_part_of_custom_pack`   | BOOLEAN | Indicateur d'appartenance à un pack |

---

## API Environmental

### Base Path

```
/catalog-api/v1/{companySlug}/environmental
```

### Endpoints Disponibles

| Méthode | Endpoint                | Description               |
| ------- | ----------------------- | ------------------------- |
| GET     | `/categories`           | Données CO2 par catégorie |
| GET     | `/products/{productId}` | Données CO2 d'un produit  |

---

### GET /environmental/categories

Récupère toutes les données environnementales par catégorie.

**URL :** `/catalog-api/v1/{companySlug}/environmental/categories`

**Réponse :**

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

---

### GET /environmental/products/{productId}

Récupère les données CO2 pour un produit spécifique.

**URL :** `/catalog-api/v1/{companySlug}/environmental/products/{productId}`

**Réponse :**

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

### Équivalences CO2

Le système calcule automatiquement les équivalences :

- **Distance en voiture** : 1 kg CO2 ≈ 6 km en voiture
- **Absorption d'arbres** : 1 kg CO2 ≈ 20 kg absorbés par arbre/mois

### Données par Défaut

| Catégorie      | CO2 économisé (kg) | Source                    |
| -------------- | ------------------ | ------------------------- |
| Serveurs       | 300                | Base de données iTakecare |
| Laptop/Desktop | 170                | Base de données iTakecare |
| Tablettes      | 87                 | Base de données iTakecare |
| Écrans         | 85                 | Base de données iTakecare |
| Imprimantes    | 65                 | Base de données iTakecare |
| Smartphones    | 45                 | Base de données iTakecare |
| Accessoires    | 15-25              | Base de données iTakecare |

Les catégories sans données réelles utilisent automatiquement des valeurs de fallback basées sur impactco2.fr.

---

## Structures de Données

### Product Object

```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  monthly_price: number;
  image_url?: string;
  brand?: string;
  category?: string;
  description?: string;
  short_description?: string;
  active: boolean;
  has_variants: boolean;
  variants?: ProductVariant[];
  variation_attributes?: Record<string, string[]>;
  specifications?: Record<string, any>;
}
```

### Category Object

```typescript
interface Category {
  id: string;
  name: string;
  translation: string;
  description?: string;
  co2_savings_kg?: number;
  environmental_impact?: EnvironmentalData;
}
```

### Upsell Object

```typescript
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
  source: 'manual'; // Toujours 'manual' (upsells 100% configurés par admin)
  priority?: number; // Ordre d'affichage
}
```

### Pack Object

```typescript
interface Pack {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  is_featured: boolean;
  admin_only: boolean;
  valid_from?: string; // ISO 8601
  valid_to?: string; // ISO 8601
  total_purchase_price: number;
  total_monthly_price: number;
  total_margin: number;
  pack_monthly_price?: number;
  pack_promo_price?: number;
  promo_active: boolean;
  promo_valid_from?: string; // ISO 8601
  promo_valid_to?: string; // ISO 8601
  leaser_id?: string;
  selected_duration?: number;
  items: PackItem[];
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### PackItem Object

```typescript
interface PackItem {
  id: string;
  pack_id: string;
  product_id: string;
  variant_price_id?: string;
  quantity: number;
  unit_purchase_price: number;
  unit_monthly_price: number;
  margin_percentage: number;
  position: number;
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    short_description?: string;
    image_url?: string;
    brand_name?: string;
    category_name?: string;
    specifications?: Record<string, any>;
  };
  variant_price?: {
    id: string;
    attributes: Record<string, string>;
    price: number;
    monthly_price?: number;
  };
}
```

### Environmental Data Object

```typescript
interface EnvironmentalData {
  id: string;
  category_id: string;
  co2_savings_kg: number;
  carbon_footprint_reduction_percentage?: number;
  energy_savings_kwh?: number;
  water_savings_liters?: number;
  waste_reduction_kg?: number;
  source_url?: string;
  last_updated?: string;
}
```

### Custom Pack Objects (v2024.4)

```typescript
interface CustomPackRequest {
  custom_pack_id: string;              // UUID du pack (généré frontend)
  pack_name: string;                   // Nom du pack
  discount_percentage: number;         // % de réduction (2-5)
  items: CustomPackItem[];             // Liste des produits
}

interface CustomPackItem {
  product_id: string;                  // UUID du produit
  quantity: number;                    // Quantité commandée
  variant_id?: string;                 // UUID de la variante (optionnel)
}

interface ProductRequest {
  // Champs existants
  product_id: string;
  product_name: string;
  variant_name?: string;
  variant_id?: string;
  quantity: number;
  duration: number;
  unit_price: number;                  // ⚠️ Prix AVEC réduction si pack
  total_price: number;

  // ✅ NOUVEAUX CHAMPS POUR PACKS
  pack_id?: string;                    // UUID du pack (si fait partie d'un pack)
  pack_discount_percentage?: number;   // % de réduction du pack (2-5)
}

interface PacksSummary {
  pack_name: string;
  discount_percentage: number;
  monthly_savings: number;
  original_monthly_total: number;
  discounted_monthly_total: number;
}
```

---

## Gestion des Erreurs

### Codes de Statut HTTP

| Code | Signification         | Description                       |
| ---- | --------------------- | --------------------------------- |
| 200  | OK                    | Requête réussie                   |
| 400  | Bad Request           | Paramètres invalides ou manquants |
| 401  | Unauthorized          | Clé API manquante ou invalide     |
| 404  | Not Found             | Ressource non trouvée             |
| 405  | Method Not Allowed    | Méthode HTTP non supportée        |
| 429  | Too Many Requests     | Limite de taux dépassée           |
| 500  | Internal Server Error | Erreur serveur                    |

### Format des Erreurs

```json
{
  "error": "Message d'erreur descriptif",
  "code": "ERROR_CODE",
  "details": {
    "field": "Détails supplémentaires"
  }
}
```

### Exemples d'Erreurs

**401 - Clé API manquante :**

```json
{
  "error": "API key manquante ou invalide",
  "code": "UNAUTHORIZED"
}
```

**404 - Produit non trouvé :**

```json
{
  "error": "Produit non trouvé",
  "code": "NOT_FOUND",
  "details": {
    "productId": "550e8400-..."
  }
}
```

**400 - Données manquantes (Product Request) :**

```json
{
  "error": "Données manquantes : company_info.company_name et contact_info.email sont requis"
}
```

---

## Exemples de Code

### JavaScript / TypeScript

#### Récupérer le Catalogue

```typescript
const API_KEY = 'your_api_key_here';
const COMPANY_SLUG = 'itakecare';
const BASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api';

async function getCatalog(filters?: {
  search?: string;
  category?: string;
  page?: number;
}) {
  const params = new URLSearchParams({
    ...(filters?.search && { search: filters.search }),
    ...(filters?.category && { category: filters.category }),
    ...(filters?.page && { page: filters.page.toString() }),
  });

  const response = await fetch(
    `${BASE_URL}/v1/${COMPANY_SLUG}/products?${params}`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Usage
const catalog = await getCatalog({
  search: 'macbook',
  page: 1
});
```

#### Récupérer les Upsells d'un Produit

```typescript
async function getProductUpsells(
  productId: string,
  limit: number = 6
): Promise<UpsellsResponse> {
  const response = await fetch(
    `${BASE_URL}/v1/${COMPANY_SLUG}/products/${productId}/upsells?limit=${limit}`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch upsells');
  }

  return response.json();
}

// Usage
const { upsells, manual_count } = await getProductUpsells('product-uuid', 6);

// Afficher les upsells manuels
upsells.forEach(upsell => {
  console.log(`${upsell.name} - ${upsell.monthly_price}€/mois`);
  console.log(`Source: ${upsell.source}, Priority: ${upsell.priority}`);
});
```

#### Soumettre une Demande de Produit

```typescript
async function createProductRequest(requestData: {
  contact_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  company_info: {
    company_name: string;
    vat_number?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  products: Array<{
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  create_client_account?: boolean;
  notes?: string;
}) {
  const response = await fetch(
    'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create request');
  }

  return response.json();
}

// Usage
const result = await createProductRequest({
  contact_info: {
    first_name: 'Marie',
    last_name: 'Martin',
    email: 'marie.martin@example.com',
    phone: '+32 471 23 45 67',
  },
  company_info: {
    company_name: 'Tech Solutions SA',
    vat_number: 'BE0987654321',
    city: 'Brussels',
  },
  products: [
    {
      product_name: 'MacBook Pro 14"',
      variant_name: 'M3 Pro - 512GB',
      quantity: 2,
      unit_price: 99.96,
      total_price: 2499,
    },
  ],
  create_client_account: true,
  notes: 'Formation équipe commerciale',
});

console.log(`Offre créée: ${result.id}`);
console.log(`Mensualité: ${result.monthly_payment}€`);
```

#### Récupérer les Données CO2

```typescript
async function getProductCO2(productId: string) {
  const response = await fetch(
    `${BASE_URL}/v1/${COMPANY_SLUG}/environmental/products/${productId}`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch CO2 data');
  }

  return response.json();
}

// Usage
const { product } = await getProductCO2('product-uuid');
const co2Kg = product.co2_savings_kg;
const carKilometers = co2Kg * 6;
const treeMonths = co2Kg / 20;

console.log(`${co2Kg}kg CO2 économisés`);
console.log(`≈ ${carKilometers}km en voiture`);
console.log(`≈ ${treeMonths.toFixed(1)} mois d'absorption d'un arbre`);
```

### React Hook Exemple

```typescript
import { useState, useEffect } from 'react';

function useProductUpsells(productId: string, limit: number = 6) {
  const [upsells, setUpsells] = useState<ProductUpsell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUpsells() {
      try {
        setLoading(true);
        const data = await getProductUpsells(productId, limit);
        setUpsells(data.upsells);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchUpsells();
    }
  }, [productId, limit]);

  return { upsells, loading, error };
}

// Usage dans un composant
function ProductPage({ productId }: { productId: string }) {
  const { upsells, loading } = useProductUpsells(productId, 6);

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h2>Produits recommandés</h2>
      {upsells.map(upsell => (
        <div key={upsell.id}>
          <h3>{upsell.name}</h3>
          <p>{upsell.monthly_price}€/mois</p>
          <span>Recommandé par nos experts</span>
        </div>
      ))}
    </div>
  );
}
```

### cURL

#### Récupérer les Produits

```bash
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products?category=laptop&limit=10" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Récupérer les Upsells

```bash
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/products/550e8400-e29b-41d4-a716-446655440000/upsells?limit=5" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Soumettre une Demande de Produit

```bash
curl -X POST "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_info": {
      "first_name": "Jean",
      "last_name": "Dupont",
      "email": "jean.dupont@example.com"
    },
    "company_info": {
      "company_name": "Acme Corp"
    },
    "products": [{
      "product_name": "MacBook Pro 14\"",
      "quantity": 1,
      "unit_price": 99.96,
      "total_price": 2499
    }]
  }'
```

#### Récupérer les Données CO2

```bash
curl "https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/itakecare/environmental/categories" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Rate Limiting et Bonnes Pratiques

### Rate Limiting

- **Limite** : 100 requêtes par heure par adresse IP
- **Header** : `X-RateLimit-Remaining` retourné avec chaque requête
- **Dépassement** : Code `429` retourné si limite dépassée

### Bonnes Pratiques

#### Caching Côté Client

**Recommandé :**

- Catégories : 15 minutes
- Produits : 5 minutes
- Upsells : 5 minutes
- Données CO2 : 10 minutes

**Exemple (React Query) :**

```typescript
const { data } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => getCatalog(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

#### Optimisation des Requêtes

1. **Utilisez la pagination** : Ne chargez pas tous les produits d'un coup
2. **Filtres précis** : Utilisez `category` et `brand` pour réduire les résultats
3. **Lazy loading** : Chargez les upsells uniquement quand nécessaire
4. **Debounce** : Pour les recherches en temps réel, debounce de 300-500ms

#### Gestion des Erreurs

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();

      if (response.status === 429) {
        // Rate limit: attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### Sécurité

- **Clé API** : Ne jamais exposer votre clé API côté client
- **Proxy** : Utilisez un proxy serveur pour les appels API sensibles
- **HTTPS** : Toujours utiliser HTTPS pour les requêtes
- **Validation** : Valider toutes les données utilisateur avant l'envoi

---

## Changelog

### Version 2026.1 - Consentement RGPD (appel IA + WhatsApp/SMS) - 14 juin 2026

- **Nouveaux champs racine** `voice_consent` et `messaging_consent` (booléens, optionnels) sur l'API Product Request
- `voice_consent` → consentement aux **appels téléphoniques et à l'assistant vocal IA (Alex)**
- `messaging_consent` → consentement aux **messages WhatsApp / SMS**
- Côté iTakecare : horodatage **unique** du consentement sur la fiche client (`voice_consent_given_at`, `messaging_opt_in_at`), la date d'origine étant préservée ; enregistrement **non bloquant** pour la création de la demande
- Recommandation site : case(s) de consentement **non pré-cochée(s)** ; possibilité d'une case unique combinée ou de deux cases distinctes (consentement granulaire)

---

### Version 2025.7 - Identification des Types de Demandes - 24 novembre 2025

- **Champ `source` automatique** : `custom_pack` ou `web_catalog` selon présence de `packs[]`
- **Badges visuels** dans l'interface admin (violet pour packs, bleu pour catalogue)
- **Filtre dédié** par type de source dans la liste des demandes
- Améliore le suivi des conversions par canal

---

### Version 2024.4 - Packs Personnalisés - 23 novembre 2025

- Support complet des packs personnalisés avec réductions progressives (2%-5%)
- Nouveau champ `packs[]` et extension de `products[]` avec `pack_id` et `pack_discount_percentage`
- Calcul automatique des économies et réponse enrichie avec `packs_summary`
- Nouvelle table `offer_custom_packs` et extension de `offer_equipment`
- Système de réductions progressives : 100-110€ (-2%), 110-125€ (-3%), 125-150€ (-4%), >150€ (-5%)

---

## Support et Contact

### Documentation Complémentaire

- **Site web** : [www.itakecare.be](https://www.itakecare.be)
- **Email** : hello@itakecare.be
- **Téléphone** : +32 (0)71 49 16 85

### Demande de Clé API

Pour obtenir votre clé API, contactez-nous à hello@itakecare.be avec :

- Le nom de votre entreprise
- L'URL de votre site web
- Votre cas d'usage prévu

### Rapporter un Bug

Si vous rencontrez un problème avec l'API :

1. Vérifiez cette documentation
2. Consultez les logs de votre application
3. Contactez-nous avec les détails de votre requête et la réponse reçue

---

**iTakecare SRL**  
Avenue du Général Michel 1E  
BE-6000 Charleroi  
TVA : BE0795.642.894

© 2025 iTakecare - Leasing de pack informatique simple, économique et éco-responsable pour PME et startup
