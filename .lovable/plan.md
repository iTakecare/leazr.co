

# Plan : Système de Packs Partenaires avec Prestataires Externes

Ce projet est conséquent. Je propose de le découper en **4 phases** pour avancer de manière incrémentale et testable.

---

## Phase 1 — Modèle de données (Migration SQL)

### Nouvelles tables

```text
partners
├── id (uuid PK)
├── company_id (FK companies)
├── name (text)
├── slug (text UNIQUE) ← pour itakecare.be/partner_slug
├── description (text) ← texte de présentation
├── logo_url (text)
├── website_url (text)
├── is_active (boolean)
├── created_at / updated_at
└── UNIQUE(company_id, slug)

partner_packs
├── id (uuid PK)
├── partner_id (FK partners)
├── pack_id (FK product_packs)
├── position (int) ← ordre d'affichage
├── is_customizable (boolean) ← le client peut ajouter des options
└── created_at

partner_pack_options
├── id (uuid PK)
├── partner_pack_id (FK partner_packs)
├── category_name (text) ← ex: "Tablette", "Périphérique"
├── is_required (boolean)
├── max_quantity (int, default 1)
├── position (int)
└── allowed_product_ids (uuid[]) ← produits sélectionnables dans cette catégorie

external_providers
├── id (uuid PK)
├── company_id (FK companies)
├── name (text) ← ex: "Proximus"
├── logo_url (text)
├── website_url (text)
├── description (text)
├── is_active (boolean)
├── created_at / updated_at

external_provider_products
├── id (uuid PK)
├── provider_id (FK external_providers)
├── name (text) ← ex: "Abonnement mobile"
├── description (text)
├── price_htva (numeric) ← 9,99€
├── billing_period (text) ← 'monthly', 'yearly', 'one_time'
├── is_active (boolean)
├── position (int)
├── created_at

partner_provider_links
├── id (uuid PK)
├── partner_id (FK partners)
├── provider_id (FK external_providers)
├── position (int) ← ordre des "cartes" sur la page partenaire
├── card_title (text) ← ex: "Téléphonie"
├── selected_product_ids (uuid[]) ← quels produits du provider sont visibles pour ce partenaire
```

### RLS
- Toutes les tables : lecture publique des données actives (pour la page partenaire publique), écriture restreinte aux utilisateurs authentifiés avec company_id matching.
- Les external_provider_products sont en lecture seule côté public.

---

## Phase 2 — Admin : Gestion des Partenaires et Prestataires

### 2.1 Nouvel onglet "Partenaires" dans Catalogue > Packs

Dans `CatalogManagement.tsx`, ajouter un onglet **"Partenaires"** (icône `Handshake`).

**Composant `PartnerManager`** :
- Liste des partenaires (nom, slug, logo, nb de packs liés, statut actif)
- CRUD partenaire : nom, slug (auto-généré depuis le nom), description, logo (upload), site web
- Pour chaque partenaire :
  - Onglet "Packs" : lier/délier des packs existants, configurer les options personnalisables par catégorie
  - Onglet "Prestataires" : lier des prestataires externes, choisir quels produits afficher, définir le titre de la carte

### 2.2 Nouvel onglet "Prestataires externes" dans Catalogue > Packs

**Composant `ExternalProviderManager`** :
- Liste des prestataires (nom, logo, nb produits)
- CRUD prestataire : nom, logo (upload), site web, description
- Gestion des produits du prestataire : nom, description, prix HTVA, période de facturation

### Modification de `CatalogManagement.tsx`
Ajouter 2 nouveaux `TabsTrigger` + `TabsContent` pour "Partenaires" et "Prestataires".

---

## Phase 3 — Page publique partenaire

### Route : `/:partnerSlug`

Nouveau composant `PartnerLandingPage.tsx` :

```text
┌─────────────────────────────────────┐
│  Logo partenaire + Nom              │
│  Texte de présentation              │
├─────────────────────────────────────┤
│  Nos packs                          │
│  ┌─────────┐ ┌─────────┐           │
│  │ Pack 1   │ │ Pack 2   │          │
│  │ prix/mois│ │ prix/mois│          │
│  │ [Voir]   │ │ [Voir]   │          │
│  └─────────┘ └─────────┘           │
├─────────────────────────────────────┤
│  Personnalisez votre pack           │
│  [Dropdown Tablette ▼]  qty: [1]   │
│  [Dropdown Périphérique ▼]          │
├─────────────────────────────────────┤
│  Services partenaires               │
│  ┌──────────────────────┐           │
│  │ 🟦 Carte Téléphonie  │           │
│  │ Logo Proximus (lien) │           │
│  │ ☐ Abo mobile 9,99€   │          │
│  │ ☐ Abo IP 10,99€      │          │
│  └──────────────────────┘           │
├─────────────────────────────────────┤
│  [Demander un devis]                │
└─────────────────────────────────────┘
```

**Fonctionnement** :
- Fetch du partenaire par slug (RPC ou query publique)
- Affichage des packs liés avec prix
- Dropdowns de personnalisation (produits filtrés par catégorie depuis `partner_pack_options`)
- Cartes prestataires avec checkboxes pour sélectionner des services
- Bouton "Demander un devis" → formulaire de contact envoyant une notification admin (réutilise le système existant `create-product-request`)

### Routing
Dans le router, ajouter la route `/:partnerSlug` avec une logique de détection (similaire à `PublicSlugCatalog`) : vérifier d'abord si le slug correspond à un partenaire, sinon fallback vers le comportement existant (company slug).

---

## Phase 4 — Documentation API

Mettre à jour les fichiers de documentation (`catalog-skeleton/`) pour documenter :
- Les nouveaux endpoints/tables : partners, external_providers, partner_packs
- Le format de la page partenaire publique
- Les types TypeScript associés

---

## Fichiers impactés (estimation)

| Fichier | Action |
|---|---|
| Migration SQL | Création des 6 tables + RLS |
| `src/types/partner.ts` | Nouveau — types TS |
| `src/services/partnerService.ts` | Nouveau — CRUD partenaires |
| `src/services/externalProviderService.ts` | Nouveau — CRUD prestataires |
| `src/components/partners/PartnerManager.tsx` | Nouveau — admin partenaires |
| `src/components/partners/ExternalProviderManager.tsx` | Nouveau — admin prestataires |
| `src/pages/CatalogManagement.tsx` | Ajout 2 onglets |
| `src/pages/PartnerLandingPage.tsx` | Nouveau — page publique |
| `src/App.tsx` (routing) | Ajout route /:partnerSlug |
| `catalog-skeleton/` | Mise à jour docs |

---

## Suggestion d'implémentation

Vu la taille du projet, je recommande de commencer par **Phase 1 + Phase 2** (modèle de données + admin) pour pouvoir créer et configurer des partenaires avant de construire la page publique. Cela permet de tester progressivement.

