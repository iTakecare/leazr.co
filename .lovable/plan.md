

# Plan : Interface Mobile Complète PWA pour Leazr

## Résumé des Choix Utilisateur

| Critère | Choix |
|---------|-------|
| Espaces prioritaires | **Tous** (Admin + Client + Ambassadeur + Public) |
| Navigation | **Bottom Navigation** type app native |
| Affichage données | **Cards avec swipe** (appeler, email, supprimer, traité) |
| PWA | **Oui, complète** avec installation + offline |
| Pages prioritaires | Dashboard, Offres, Clients, Contrats |
| Actions rapides | Créer offre, Scanner, Recherche, Notifications |
| Mode offline | **Consultation + Création** avec synchronisation |

---

## Architecture de la Solution

### Approche Technique

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          MOBILE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  useIsMobile() → true                                                   │
│       ↓                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  MobileLayout                                                    │   │
│  │  ├── MobileHeader (sticky top)                                   │   │
│  │  ├── MobilePageContainer (contenu scrollable)                    │   │
│  │  └── MobileBottomNav (fixed bottom)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Composants Mobiles Réutilisables                                │   │
│  │  ├── MobileSwipeCard (avec actions gauche/droite)                │   │
│  │  ├── MobileFilterSheet (bottom drawer)                           │   │
│  │  ├── MobileSearchSheet (recherche plein écran)                   │   │
│  │  ├── MobileFAB (Floating Action Button)                          │   │
│  │  └── MobilePullToRefresh                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Cards Spécialisées avec Swipe                                   │   │
│  │  ├── MobileOfferCard (swipe: appeler, email, supprimer)          │   │
│  │  ├── MobileClientCard (swipe: appeler, email, supprimer)         │   │
│  │  └── MobileContractCard (swipe: email, télécharger)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 : Configuration PWA

### Fichiers à Créer/Modifier

| Fichier | Action |
|---------|--------|
| `vite.config.ts` | Ajouter plugin vite-plugin-pwa |
| `public/manifest.json` | Manifest PWA avec icônes |
| `public/sw.js` | Service Worker pour offline |
| `public/icons/` | Icônes PWA (192x192, 512x512) |
| `src/index.html` | Meta tags mobile + manifest link |
| `src/hooks/useOfflineSync.ts` | Hook pour synchronisation offline |
| `src/lib/offlineStorage.ts` | IndexedDB pour stockage local |

### Configuration PWA

**manifest.json** :
```json
{
  "name": "Leazr - Gestion Leasing",
  "short_name": "Leazr",
  "description": "Gestion de leasing informatique",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker Strategy** :
- Cache First pour assets statiques
- Network First pour API avec fallback offline
- Background Sync pour créations offline

---

## Phase 2 : Infrastructure Mobile

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/components/mobile/MobileLayout.tsx` | Layout wrapper conditionnel |
| `src/components/mobile/MobileHeader.tsx` | Header compact 56px |
| `src/components/mobile/MobileBottomNav.tsx` | Bottom nav 64px + safe area |
| `src/components/mobile/MobilePageContainer.tsx` | Container avec scroll |

### MobileBottomNav - Navigation Principale

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   🏠          📋          ➕          📁          👤                  │
│  Accueil    Demandes    Créer     Contrats    Profil                   │
│                                                                         │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                       (safe area iPhone)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Caractéristiques** :
- 5 items maximum pour confort tactile
- Badge de notification sur icônes
- Animation de sélection active
- Support safe-area-inset-bottom pour iPhone

### MobileHeader - En-tête Compact

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ≡    📷 Scanner          LEAZR           🔔 (2)     🔍              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Actions** :
- Menu hamburger (paramètres, déconnexion)
- Bouton scanner document
- Logo centré
- Notifications avec badge
- Recherche globale

---

## Phase 3 : Composants Swipeable

### MobileSwipeCard - Composant de Base

```text
                    ← SWIPE GAUCHE ←
┌───────────────────────────────────────────────────┬─────────┬─────────┐
│                                                   │  ✓      │  🗑️    │
│  Contenu de la card                               │ Traité  │ Suppr.  │
│                                                   │         │         │
└───────────────────────────────────────────────────┴─────────┴─────────┘

                    → SWIPE DROITE →
┌─────────┬─────────┬───────────────────────────────────────────────────┐
│  📞     │  ✉️     │                                                   │
│ Appeler │ Email   │  Contenu de la card                               │
│         │         │                                                   │
└─────────┴─────────┴───────────────────────────────────────────────────┘
```

**Implementation avec Framer Motion** :
- Seuil de déclenchement : 80px
- Haptic feedback sur action
- Animation spring pour retour
- Couleurs : vert (appeler), bleu (email), rouge (supprimer), gris (traité)

### MobileOfferCard - Card Offre

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  #DEM-2024-001                              🟢 Score A                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  👤 Jean Dupont                                                         │
│  🏢 Entreprise SARL                                                     │
│  📧 jean.dupont@entreprise.fr                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  💰 15 000 €        📅 36 mois        💳 450 €/mois                     │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│      📄 Envoyée            📋 En attente signature                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
← Swipe: [📞 Appeler] [✉️ Email]    Swipe: [✓ Traité] [🗑️ Suppr.] →
```

### MobileClientCard - Card Client

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  👤 Marie Martin                                         🏷️ Premium    │
│  ─────────────────────────────────────────────────────────────────────  │
│  🏢 TechCorp SARL                                                       │
│  📧 marie.martin@techcorp.be                                            │
│  📞 +32 475 123 456                                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📋 3 offres       📁 2 contrats actifs       💰 45 000 € CA           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
← Swipe: [📞 Appeler] [✉️ Email]              Swipe: [🗑️ Suppr.] →
```

---

## Phase 4 : Composants Utilitaires

### MobileFilterSheet - Filtres en Bottom Drawer

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ───────────────────────  (handle)  ─────────────────────────────────── │
│                                                                         │
│  🔍 Rechercher...                                            ✕ Clear   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Statut                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                          │
│  │  Tous  │ │ Envoyé │ │ Signé  │ │Approuvé│                          │
│  └────────┘ └────────┘ └────────┘ └────────┘                          │
│                                                                         │
│  Type                                                                   │
│  ○ Tous  ○ Leasing  ○ Vente directe  ○ Ambassadeur                     │
│                                                                         │
│  Score                                                                  │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───────┐                                    │
│  │ A │ │ B │ │ C │ │ D │ │ Tous  │                                    │
│  └───┘ └───┘ └───┘ └───┘ └───────┘                                    │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│       [Réinitialiser]                    [Appliquer (24 résultats)]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### MobileSearchSheet - Recherche Plein Écran

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ←   🔍 Rechercher clients, offres, contrats...              Annuler   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Recherches récentes                                                    │
│  ────────────────────                                                   │
│  🕐 Jean Dupont                                                         │
│  🕐 TechCorp                                                            │
│  🕐 DEM-2024-001                                                        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Résultats                                                              │
│  ────────────────────                                                   │
│                                                                         │
│  👤 Clients (3)                                                         │
│  ├── Jean Dupont - Entreprise SARL                                     │
│  ├── Marie Martin - TechCorp                                           │
│  └── Paul Bernard - StartupXYZ                                         │
│                                                                         │
│  📋 Offres (5)                                                          │
│  ├── DEM-2024-001 - Jean Dupont - 15 000 €                             │
│  └── ...                                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### MobileFAB - Bouton Action Flottant

```text
                                                    ┌─────────────────┐
                                                    │ 📷 Scanner doc  │
                                                    └─────────────────┘
                                                    ┌─────────────────┐
                                                    │ 📋 Nouvelle offre│
                                                    └─────────────────┘
                                                              ╔═══╗
                                                              ║ + ║
                                                              ╚═══╝
```

**Comportement** :
- Position fixe bas droite (avant bottom nav)
- Tap : expand menu d'actions
- Long press : action principale (nouvelle offre)

---

## Phase 5 : Mode Offline avec Synchronisation

### Architecture Offline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         MODE OFFLINE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │   IndexedDB     │         │  Service Worker │                       │
│  │  ─────────────  │         │  ─────────────  │                       │
│  │  - Offres       │ ←sync→  │  - Cache assets │                       │
│  │  - Clients      │         │  - Cache API    │                       │
│  │  - Contrats     │         │  - Background   │                       │
│  │  - Actions      │         │    Sync         │                       │
│  │    en attente   │         │                 │                       │
│  └─────────────────┘         └─────────────────┘                       │
│           ↓                           ↓                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RECONNEXION                                   │   │
│  │  1. Récupérer actions en attente                                 │   │
│  │  2. Synchroniser avec serveur (POST/PUT)                         │   │
│  │  3. Rafraîchir données locales                                   │   │
│  │  4. Notifier utilisateur                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/lib/offlineStorage.ts` | Wrapper IndexedDB (Dexie.js) |
| `src/hooks/useOfflineSync.ts` | Hook de synchronisation |
| `src/hooks/useNetworkStatus.ts` | Détection connexion |
| `src/components/mobile/OfflineIndicator.tsx` | Bandeau "Mode hors ligne" |
| `src/components/mobile/SyncStatus.tsx` | Indicateur synchronisation |

### Indicateur Offline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚡ Mode hors ligne - 3 actions en attente de synchronisation          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 6 : Adaptations par Espace

### Espace Admin Mobile

| Page | Composants Mobiles |
|------|-------------------|
| Dashboard | `MobileDashboardWidgets` (widgets empilés, swipe horizontal graphiques) |
| Offres | `MobileOfferCard` + `MobileFilterSheet` + `MobileFAB` |
| Clients | `MobileClientCard` + `MobileSearchSheet` |
| Contrats | `MobileContractCard` + filtres inline |
| Paramètres | Accordéons avec sections |

### Espace Client Mobile

| Page | Composants Mobiles |
|------|-------------------|
| Dashboard | Cards actions + timeline activité |
| Équipements | Liste cards avec images |
| Demandes | Timeline verticale badges |
| Contrats | Cards avec téléchargement PDF |
| Catalogue | Grille 2 colonnes + filtre drawer |

### Espace Ambassadeur Mobile

| Page | Composants Mobiles |
|------|-------------------|
| Dashboard | Stats commissions + dernières activités |
| Filleuls | Cards clients référés |
| Commissions | Historique avec filtres |

### Catalogue Public Mobile

| Page | Composants Mobiles |
|------|-------------------|
| Liste produits | Grille 2 colonnes + filtre drawer |
| Détail produit | Carousel images + actions sticky |
| Panier/Devis | Récapitulatif sticky bottom |

---

## Phase 7 : Gestures et Animations

### Gestures Supportées

| Gesture | Action |
|---------|--------|
| Pull-to-refresh | Actualiser la liste |
| Swipe horizontal card | Actions rapides |
| Swipe bottom sheet | Ouvrir/fermer filtres |
| Long press | Menu contextuel |
| Pinch-to-zoom | Zoom images produits |

### Animations Framer Motion

```typescript
// Swipe card
const swipeVariants = {
  initial: { x: 0 },
  swipeLeft: { x: -80, transition: { type: "spring" } },
  swipeRight: { x: 80, transition: { type: "spring" } },
};

// Bottom sheet
const sheetVariants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { type: "spring", damping: 25 } },
};
```

---

## Fichiers à Créer - Récapitulatif

### Infrastructure (Phase 1-2)
```text
src/
├── components/
│   └── mobile/
│       ├── MobileLayout.tsx
│       ├── MobileHeader.tsx
│       ├── MobileBottomNav.tsx
│       ├── MobilePageContainer.tsx
│       ├── MobileSwipeCard.tsx
│       ├── MobileFilterSheet.tsx
│       ├── MobileSearchSheet.tsx
│       ├── MobileFAB.tsx
│       ├── MobilePullToRefresh.tsx
│       ├── OfflineIndicator.tsx
│       └── SyncStatus.tsx
├── hooks/
│   ├── useOfflineSync.ts
│   └── useNetworkStatus.ts
└── lib/
    └── offlineStorage.ts

public/
├── manifest.json
├── sw.js
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

### Cards Spécialisées (Phase 3)
```text
src/components/mobile/cards/
├── MobileOfferCard.tsx
├── MobileClientCard.tsx
├── MobileContractCard.tsx
├── MobileProductCard.tsx
└── MobileEquipmentCard.tsx
```

### Pages Mobiles (Phase 6)
```text
src/components/mobile/pages/
├── MobileDashboard.tsx
├── MobileOffers.tsx
├── MobileClients.tsx
├── MobileContracts.tsx
├── MobileClientDashboard.tsx
├── MobileCatalog.tsx
└── MobileSettings.tsx
```

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `vite.config.ts` | Ajouter vite-plugin-pwa |
| `index.html` | Meta tags mobile + manifest |
| `tailwind.config.ts` | Breakpoint xs + safe-area utilities |
| `src/components/layout/Layout.tsx` | Conditionnel MobileLayout |
| `src/pages/Dashboard.tsx` | Rendu conditionnel mobile |
| `src/pages/Offers.tsx` | Rendu conditionnel mobile |
| `src/pages/Clients.tsx` | Rendu conditionnel mobile |
| Et autres pages... | Adaptation responsive |

---

## Dépendances à Ajouter

```json
{
  "vite-plugin-pwa": "^0.20.0",
  "dexie": "^4.0.0",
  "dexie-react-hooks": "^1.1.0"
}
```

Note : `framer-motion` est déjà installé (v12.6.5).

---

## Ordre d'Implémentation Recommandé

1. **Phase 1** : Configuration PWA (manifest, icons, meta tags)
2. **Phase 2** : Infrastructure mobile (MobileLayout, Header, BottomNav)
3. **Phase 3** : MobileSwipeCard avec animations
4. **Phase 4** : Cards spécialisées (Offer, Client, Contract)
5. **Phase 5** : Filtres et recherche (Sheet, Search)
6. **Phase 6** : Mode offline (IndexedDB, sync)
7. **Phase 7** : Adaptations pages Admin
8. **Phase 8** : Adaptations pages Client
9. **Phase 9** : Catalogue public mobile
10. **Phase 10** : Tests et polish

