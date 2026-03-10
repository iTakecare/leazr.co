

# Ajouter le CRM au menu mobile et créer une version mobile-native

## Constat
- Le CRM (`CompanyCRM.tsx`) existe mais **n'a pas de route admin** dans `App.tsx`
- La bottom nav mobile a 5 items (Accueil, Demandes, Créer, Contrats, Profil) — pas d'accès CRM
- Le composant CRM actuel utilise des tables desktop non adaptées au mobile

## Plan

### 1. Ajouter la route CRM dans les routes admin
**Fichier** : `src/App.tsx`
- Ajouter `<Route path="crm" element={<Layout><CRMPage /></Layout>} />` dans les routes `/:companySlug/admin/*`
- Importer `CRMPage`

### 2. Remplacer "Contrats" par "CRM" dans la bottom nav admin
**Fichier** : `src/components/mobile/MobileBottomNav.tsx`
- Remplacer l'item "Contrats" (`/admin/contracts`) par "CRM" (`/admin/crm`) avec l'icône `Users`
- Les contrats restent accessibles via le CRM et la page Demandes — le CRM est plus utile en accès direct

### 3. Créer une page mobile CRM native
**Fichier** : `src/components/mobile/pages/MobileCRMPage.tsx`

Structure mobile-first :
- **Header** : `MobileLayout` avec titre "CRM"
- **4 KPI cards** empilées horizontalement (scroll) : Clients, Demandes, Contrats, Ambassadeurs
- **Barre de recherche** pleine largeur
- **Tabs horizontaux** (Clients / Demandes / Contrats / Ambassadeurs)
- **Listes en cartes** au lieu de tables : chaque item = une carte avec nom, statut badge, date, et actions (swipe ou boutons)
- **FAB** (+) pour créer un nouveau client/ambassadeur

Le pattern est identique à `MobileOffersPage.tsx` et `MobileContractsPage.tsx` déjà existants.

### 4. Détection mobile dans CompanyCRM
**Fichier** : `src/components/crm/CompanyCRM.tsx` (ou `CRMPage.tsx`)
- Ajouter `useIsMobile()` et rendre `MobileCRMPage` si mobile, sinon le CRM desktop actuel
- Le `Layout` wrapper gère déjà le `MobileLayout`, mais le contenu interne (tables vs cartes) doit s'adapter

### Fichiers impactés
| Fichier | Modification |
|---|---|
| `src/App.tsx` | Route `admin/crm` |
| `MobileBottomNav.tsx` | Remplacer Contrats par CRM |
| `MobileCRMPage.tsx` (nouveau) | Page CRM mobile-native |
| `CompanyCRM.tsx` ou `CRMPage.tsx` | Détection mobile + rendu conditionnel |
| `src/components/mobile/pages/index.ts` | Export du nouveau composant |

