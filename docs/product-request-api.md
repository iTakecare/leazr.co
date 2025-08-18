# API de Demande de Produits - iTakecare

## Vue d'ensemble

L'API de demande de produits permet aux clients de créer automatiquement des demandes d'équipement via le catalogue public. Elle gère la création complète d'un client et d'une offre avec calculs financiers automatiques.

## Endpoint Principal

### POST `/functions/v1/create-product-request`

Crée une demande de produit complète avec client et offre associée.

**URL complète**: `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request`

## Authentification

Cette API est publique et ne nécessite pas d'authentification. La détection de l'entreprise se fait automatiquement via le domaine de la requête.

## Détection Automatique de l'Entreprise

L'API détecte automatiquement l'entreprise cible via :
1. **Domaine/Sous-domaine** : Analyse du header `referer` pour les sous-domaines `*.leazr.co`
2. **Fallback** : Utilise `company_id` fourni dans les données ou iTakecare par défaut

## Structure de la Requête

### Headers Requis
```
Content-Type: application/json
```

### Corps de la Requête

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
  "company_id": "optional-company-uuid"
}
```

## Champs Requis

### Contact Info (Obligatoire)
- `email` : Email du contact principal
- `first_name` ou `last_name` : Au moins un nom requis

### Company Info (Obligatoire)
- `company_name` : Nom de l'entreprise cliente

### Products (Obligatoire)
- Array de produits avec au minimum :
  - `product_name` : Nom du produit
  - `quantity` : Quantité (défaut: 1)
  - `unit_price` : Prix mensuel unitaire
  - `total_price` : Prix d'achat total

## Calculs Financiers Automatiques

### Montants Calculés
- **Montant Total** (`amount`) : Somme des `total_price` de tous les produits
- **Paiement Mensuel** (`monthly_payment`) : Somme des `unit_price` de tous les produits
- **Montant Financé** (`financed_amount`) : `amount × coefficient` (3.55 par défaut)
- **Marge** : `((financed_amount - amount) / amount) × 100`

### Exemple de Calcul
```
Produit 1: unit_price: 45.50€, total_price: 1800€
Produit 2: unit_price: 25.00€, total_price: 900€

Résultats:
- amount: 2700€ (1800 + 900)
- monthly_payment: 70.50€ (45.50 + 25.00)
- financed_amount: 9585€ (2700 × 3.55)
- margin: 255.00% ((9585 - 2700) / 2700 × 100)
```

## Fonctionnalités Automatiques

### Création d'Équipements Détaillés
Chaque produit génère automatiquement :
- Un équipement dans `offer_equipment`
- Nom complet : `product_name - variant_name`
- Prix et quantités individuels
- Lien vers les IDs produit/variant

### Gestion des Comptes Clients
Si `create_client_account: true` :
1. Création automatique d'un compte Supabase Auth
2. Génération d'un lien de définition de mot de passe
3. Email d'activation personnalisé
4. Mise à jour du statut client

### Envoi d'Emails Automatique
- Templates personnalisables depuis `email_templates`
- Fallback vers template par défaut
- Variables dynamiques remplacées automatiquement
- Support Resend pour l'envoi

## Réponse de l'API

### Succès (200)
```json
{
  "id": "uuid-offer-id",
  "client_id": "uuid-client-id",
  "client_name": "Jean Dupont",
  "client_email": "jean.dupont@example.com",
  "equipment_description": "MacBook Pro 14\" - M3 Pro - 512GB (x2)",
  "amount": 2700.00,
  "monthly_payment": 70.50,
  "financed_amount": 9585.00,
  "coefficient": 3.55,
  "margin": 255.00,
  "type": "client_request",
  "workflow_status": "requested",
  "status": "pending",
  "remarks": "Demande créée via API web - Demande urgente pour le département IT",
  "company_id": "uuid-company-id",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Erreurs

#### 400 - Données Manquantes
```json
{
  "error": "Données manquantes : company_info.company_name et contact_info.email sont requis"
}
```

#### 405 - Méthode Non Supportée
```json
{
  "error": "Méthode non supportée"
}
```

#### 500 - Erreur Serveur
```json
{
  "error": "Échec de création de l'offre: [détail de l'erreur]"
}
```

## Particularités Techniques

### Type d'Offre
- **Type fixe** : `"client_request"` (compatible avec les contraintes DB)
- **Traçabilité** : Remarque automatique "Demande créée via API web"
- **Workflow** : Status initial `"requested"` et `"pending"`

### Gestion des Erreurs
- Continuation du processus même en cas d'erreur partielle
- Logs détaillés pour debugging
- Gestion gracieuse des échecs d'email ou de compte

### CORS
- Support complet des requêtes cross-origin
- Headers CORS configurés automatiquement
- Gestion des requêtes OPTIONS

## Exemples d'Utilisation

### Requête Basique
```javascript
const response = await fetch('https://cifbetjefyfocafanlhv.supabase.co/functions/v1/create-product-request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contact_info: {
      first_name: "Marie",
      last_name: "Martin",
      email: "marie.martin@example.com"
    },
    company_info: {
      company_name: "Tech Solutions SA"
    },
    products: [{
      product_name: "iPad Pro",
      quantity: 1,
      unit_price: 35.00,
      total_price: 1200.00
    }]
  })
});

const result = await response.json();
```

### Avec Création de Compte
```javascript
const requestData = {
  // ... données de base
  create_client_account: true,
  notes: "Formation équipe commerciale"
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
});
```

## Intégration avec le Catalogue

Cette API s'intègre parfaitement avec :
- **API Environnementale** : Pour le calcul d'impact CO2
- **API Catalogue** : Pour la récupération des produits publics
- **Système de Templates** : Pour la personnalisation des emails

## Logs et Monitoring

### Logs Disponibles
- Détection automatique du company_id
- Calculs financiers détaillés
- Création des équipements
- Processus d'envoi d'email
- Création de comptes clients

### Accès aux Logs
Les logs sont disponibles dans le dashboard Supabase Edge Functions.

## Sécurité

### Validation des Données
- Vérification des champs obligatoires
- Sanitization automatique des montants
- Validation des formats email

### Isolation des Données
- RLS (Row Level Security) appliqué sur toutes les tables
- Isolation automatique par entreprise
- Pas d'accès cross-company possible

## Version et Compatibilité

- **Version actuelle** : 2024.3
- **Compatibilité** : Toutes les versions du catalogue iTakecare
- **Dernière mise à jour** : 18 août 2025 - Corrections des clients libres et optimisations système

### Améliorations version 2024.3
- Correction complète de la fonction `getFreeClients` pour les offres internes
- Support des clients libres (non rattachés aux ambassadeurs)
- Amélioration de l'isolation multi-tenant des données clients
- Optimisation des fonctions RPC sécurisées (`get_free_clients_secure`, `get_all_clients_secure`)
- Logs de débogage améliorés pour un meilleur monitoring

### Edge Functions déployées
- `create-product-request`: Création automatique de clients et d'offres
- `catalog-api`: API complète du catalogue avec données environnementales
- Toutes les fonctions sont déployées sur Supabase avec configuration CORS appropriée