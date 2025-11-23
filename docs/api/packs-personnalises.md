# API Packs Personnalisés iTakecare → Leazr

## 📋 Vue d'ensemble

Cette documentation décrit l'intégration des **packs personnalisés** avec réductions progressives dans l'API Leazr pour permettre aux clients d'iTakecare de créer et commander des packs configurés dynamiquement.

### Fonctionnalité

Le configurateur de packs permet aux clients de :
- ✅ Sélectionner plusieurs produits de catégories différentes
- ✅ Bénéficier automatiquement d'une réduction progressive (2% à 5%)
- ✅ Sauvegarder et partager leur configuration
- ✅ Commander le pack avec la réduction appliquée

### Système de Réductions par Paliers

| Prix mensuel total | Réduction appliquée |
|-------------------|---------------------|
| 100,00€ - 110,00€ | -2% |
| 110,01€ - 125,00€ | -3% |
| 125,01€ - 150,00€ | -4% |
| > 150,00€ | -5% |

**Conditions** : Minimum 2 produits de 2 catégories différentes.

---

## 🔌 Endpoint API

```
POST https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request
```

### Headers

```
Content-Type: application/json
```

---

## 📦 Structure de la Requête

### Champs Racine

```typescript
{
  contact_info: ContactInfo,          // Obligatoire
  company_info: CompanyInfo,          // Obligatoire
  delivery_info: DeliveryInfo,        // Obligatoire
  products: Product[],                // Obligatoire
  packs: CustomPack[],                // ✅ NOUVEAU - Métadonnées des packs
  subtotal: number,                   // Prix total avant réductions (€)
  total: number,                      // Prix total après réductions (€)
  create_client_account: boolean,     // Optionnel (défaut: false)
  notes: string,                      // Optionnel
  request_type: string                // 'quote' | 'order'
}
```

---

## 🎁 Objet `packs` - NOUVEAU

### Structure TypeScript

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

### Exemple JSON

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

### Calcul de la Réduction

```javascript
// Prix original du pack
const originalTotal = items.reduce((sum, item) => 
  sum + (item.unit_price * item.quantity), 0
);

// Déterminer le pourcentage selon les paliers
let discountPercentage = 0;
if (originalTotal >= 100 && originalTotal <= 110) discountPercentage = 2;
else if (originalTotal > 110 && originalTotal <= 125) discountPercentage = 3;
else if (originalTotal > 125 && originalTotal <= 150) discountPercentage = 4;
else if (originalTotal > 150) discountPercentage = 5;

// Appliquer la réduction
const finalTotal = originalTotal * (1 - discountPercentage / 100);
const savings = originalTotal - finalTotal;
```

---

## 📱 Objet `products` - ÉTENDU

### Structure TypeScript

```typescript
interface Product {
  // Champs existants
  product_id: string;                  // UUID du produit
  quantity: number;                    // Quantité commandée
  variant_id?: string;                 // UUID de la variante (optionnel)
  product_name: string;                // Nom du produit
  variant_name?: string;               // Nom de la variante (optionnel)
  unit_price: number;                  // ⚠️ Prix mensuel AVEC réduction appliquée
  total_price: number;                 // Prix d'achat total (€)
  duration: number;                    // Durée du leasing (mois)
  
  // ✅ NOUVEAUX CHAMPS POUR LES PACKS
  pack_id?: string;                    // UUID du pack (si fait partie d'un pack)
  pack_discount_percentage?: number;   // % de réduction du pack (2-5)
}
```

### ⚠️ Point Important : `unit_price`

Le champ `unit_price` inclut **DÉJÀ** la réduction du pack.

**Exemple :**
```
Prix catalogue : 50,00€/mois
Réduction pack : -4%
unit_price envoyé : 48,00€/mois  ← Réduction déjà appliquée
```

### Exemple JSON

```json
{
  "products": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "variant_id": "660e8400-e29b-41d4-a716-446655440111",
      "product_name": "MacBook Pro 14\"",
      "variant_name": "M3 Pro - 512GB - 18GB RAM",
      "unit_price": 95.96,
      "total_price": 2399.00,
      "duration": 36,
      "pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_discount_percentage": 4
    },
    {
      "product_id": "770e8400-e29b-41d4-a716-446655440222",
      "quantity": 1,
      "product_name": "Magic Mouse 2",
      "unit_price": 3.84,
      "total_price": 99.00,
      "duration": 36,
      "pack_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "pack_discount_percentage": 4
    }
  ]
}
```

---

## 💡 Exemple Complet

### Scénario

Un client commande un pack personnalisé contenant :
- **2× MacBook Pro 14"** (99,96€/mois × 2 = 199,92€/mois)
- **1× Magic Mouse 2** (4,00€/mois)

**Calculs :**
- Total mensuel avant réduction : **203,92€/mois**
- Réduction applicable : **-5%** (car > 150€)
- Total mensuel après réduction : **193,72€/mois**
- **Économie : 10,20€/mois**

### Requête JSON Complète

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

### Réponse JSON

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

---

## 📊 Calculs Attendus Côté Leazr

### Formules

```javascript
// 1. Paiement mensuel total
const monthly_payment = products.reduce((sum, p) => 
  sum + (p.unit_price * p.quantity), 0
);

// 2. Montant total de la commande
const amount = products.reduce((sum, p) => 
  sum + p.total_price, 0
);

// 3. Économies réalisées grâce aux packs
const savings = products
  .filter(p => p.pack_id)
  .reduce((sum, p) => {
    const originalPrice = p.unit_price / (1 - p.pack_discount_percentage / 100);
    const discount = (originalPrice - p.unit_price) * p.quantity;
    return sum + discount;
  }, 0);
```

### Exemple de Calcul

```
Produit 1: 94,96€/mois × 2 = 189,92€/mois
Produit 2: 3,80€/mois × 1 = 3,80€/mois
─────────────────────────────────────────
Total mensuel: 193,72€/mois

Prix sans réduction:
Produit 1: 99,96€/mois × 2 = 199,92€/mois
Produit 2: 4,00€/mois × 1 = 4,00€/mois
─────────────────────────────────────────
Total sans réduction: 203,92€/mois

Économie mensuelle: 10,20€/mois
Économie sur 36 mois: 367,20€
```

---

## ✅ Points Clés pour l'Implémentation

### ✅ À Retenir

1. **Le `unit_price` inclut DÉJÀ la réduction** - Ne pas recalculer la réduction côté Leazr
2. **Tous les produits sont dans `products[]`** - Même ceux faisant partie de packs
3. **Le lien produit ↔ pack se fait via `pack_id`** - Permet de regrouper les produits d'un même pack
4. **Les métadonnées du pack sont dans `packs[]`** - Nom, réduction, liste des items
5. **Un panier peut contenir plusieurs packs** - Et également des produits individuels

### 🔗 Relations entre Objets

```
packs[0].custom_pack_id === products[0].pack_id
                         === products[1].pack_id
```

---

## 🔄 Rétrocompatibilité

### Commandes Sans Packs

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

### Détection des Packs

```javascript
// Côté Leazr, pour détecter si c'est un pack:
const hasPacks = request.packs && request.packs.length > 0;

// Ou pour un produit individuel:
const isPartOfPack = product.pack_id !== null && product.pack_id !== undefined;
```

---

## 🗄️ Stockage en Base de Données

### Tables Créées

#### `offer_custom_packs`

Stocke les métadonnées des packs personnalisés.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique du pack |
| `offer_id` | UUID | Référence à l'offre |
| `custom_pack_id` | UUID | UUID généré par le frontend |
| `pack_name` | TEXT | Nom du pack |
| `discount_percentage` | INTEGER | % de réduction (0-100) |
| `original_monthly_total` | NUMERIC | Total mensuel avant réduction |
| `discounted_monthly_total` | NUMERIC | Total mensuel après réduction |
| `monthly_savings` | NUMERIC | Économie mensuelle |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de mise à jour |

#### Extensions de `offer_equipment`

Nouvelles colonnes ajoutées pour lier les équipements aux packs.

| Colonne | Type | Description |
|---------|------|-------------|
| `custom_pack_id` | UUID | Référence au pack personnalisé |
| `pack_discount_percentage` | INTEGER | % de réduction du pack |
| `original_unit_price` | NUMERIC | Prix unitaire avant réduction |
| `is_part_of_custom_pack` | BOOLEAN | Indicateur d'appartenance à un pack |

---

## 🛡️ Sécurité & Validation

### Validation Zod

Toutes les données sont validées avec Zod pour prévenir les injections :

- ✅ UUIDs validés
- ✅ Pourcentages limités à 0-100
- ✅ Quantités et prix limités à des valeurs raisonnables
- ✅ Champs texte avec limites de longueur strictes
- ✅ Validation des formats email et pays (ISO 3166-1 alpha-2)

### Limites

- **Maximum 20 packs** par commande
- **Maximum 100 produits** par commande
- **Maximum 50 produits** par pack
- **Pourcentage de réduction** : 0-100%

---

## 📞 Contact

**Entreprise** : iTakecare.be  
**Email** : hello@itakecare.be  
**Téléphone** : +32 (0)71 49 16 85  
**Site web** : https://www.itakecare.be

Pour toute question concernant cette API, n'hésitez pas à nous contacter.

---

*Document généré le 23 novembre 2025 - Version 1.0*
