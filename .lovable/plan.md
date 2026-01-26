

# Plan : Adapter les Pages pour une Interface Mobile Native

## Problème Identifié

Actuellement, même si le `MobileLayout` (header + bottom nav) est affiché, **le contenu des pages reste identique au desktop** :
- Tableaux avec colonnes multiples qui débordent
- Filtres horizontaux (onglets) trop nombreux
- Interface non adaptée au tactile
- Pas d'utilisation des composants mobiles créés (`MobileOfferCard`, `MobileFilterSheet`, etc.)

## Solution

Créer des versions mobiles des pages principales et les afficher conditionnellement avec `useIsMobile()`.

---

## Architecture Proposée

```text
Page (ex: Offers.tsx)
       │
       ├── isMobile ? → MobileOffersPage
       │                    ├── Pull-to-refresh
       │                    ├── Liste de MobileOfferCard
       │                    ├── MobileFilterSheet (bottom drawer)
       │                    └── MobileFAB (créer offre)
       │
       └── Desktop ? → Version actuelle avec tableau
```

---

## Pages à Adapter

### 1. Page Offres (Priorité 1)

**Fichiers à créer :**
- `src/components/mobile/pages/MobileOffersPage.tsx`

**Changements :**
- Remplacer le tableau par une liste de `MobileOfferCard` avec swipe actions
- Remplacer les onglets de filtres par un `MobileFilterSheet` (bottom drawer)
- Les KPI stats deviennent des cards horizontales scrollables
- Bouton "Nouvelle demande" devient un `MobileFAB`
- Recherche via `MobileSearchSheet`

**Rendu mobile :**
```text
┌─────────────────────────────────────────────────────────────┐
│  📷    itakecare                        🔔  🔍             │  ← Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Mes demandes                                               │
│  Gérez et suivez toutes vos demandes                        │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 50 Total│ │ 9 Brouil│ │ 24 Docs │ │ 13 Envo │ →         │  ← KPIs scroll horiz.
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌──────────────────────────────┐  ┌─────────────────────┐ │
│  │ À traiter ▼                  │  │ 🔽 Filtres          │ │  ← Filtres simplifiés
│  └──────────────────────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #DEM-2024...                     🏷️ Leasing        │   │
│  │ 👤 Jean Dupont                                      │   │
│  │ 🏢 Entreprise SARL                                  │   │
│  │ 💰 15 000 €            💳 450 €/mois               │   │
│  │ ────────────────────────────────────────────────    │   │
│  │ 📅 36 mois                          12 jan 2026    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ← [📞] [✉️]                        [✓] [🗑️] →           │  ← Swipe actions
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #DEM-2024...                                        │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                              ╔═══╗          │
│                                              ║ + ║          │  ← FAB
│                                              ╚═══╝          │
├─────────────────────────────────────────────────────────────┤
│  🏠     📋     [+]     📁     👤                           │  ← Bottom Nav
│ Accueil Demandes     Contrats Profil                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Page Contrats (Priorité 2)

**Fichiers à créer :**
- `src/components/mobile/pages/MobileContractsPage.tsx`

**Changements :**
- Remplacer le tableau par une liste de `MobileContractCard`
- Filtres de statut via bottom drawer
- Chaque contrat affiche : date, client, montant mensuel, statut

### 3. Dashboard (Priorité 3)

**Fichiers à créer :**
- `src/components/mobile/pages/MobileDashboardPage.tsx`

**Changements :**
- Cards KPI empilées verticalement (full width)
- Tableau mensuel → scroll horizontal ou accordéon
- Onglets Financier/Commercial → tabs simples en haut

### 4. Page Paramètres (Priorité 4)

**Fichiers à créer :**
- `src/components/mobile/pages/MobileSettingsPage.tsx`

**Changements :**
- Remplacer les 12 onglets horizontaux par une liste de sections cliquables
- Chaque section s'ouvre dans un drawer ou une sous-page
- Design type "page de réglages iOS/Android"

**Rendu mobile Settings :**
```text
┌─────────────────────────────────────────────────────────────┐
│  Paramètres                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚙️ Général                                     >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ⚡ Intégrations                                >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ✉️ Emails                                      >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🏢 Leasers                                     >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 💰 Commissions                                 >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔀 Workflows                                   >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📄 Templates                                   >    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 👥 Utilisateurs                                >    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 Abonnement                                  >    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/components/mobile/pages/MobileOffersPage.tsx` | Liste cards offres + filtres drawer |
| `src/components/mobile/pages/MobileContractsPage.tsx` | Liste cards contrats |
| `src/components/mobile/pages/MobileDashboardPage.tsx` | Dashboard KPIs verticaux |
| `src/components/mobile/pages/MobileSettingsPage.tsx` | Menu liste avec navigation |
| `src/components/mobile/pages/index.ts` | Exports |

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/Offers.tsx` | Ajouter `useIsMobile()` + rendu conditionnel `MobileOffersPage` |
| `src/pages/Contracts.tsx` | Ajouter `useIsMobile()` + rendu conditionnel `MobileContractsPage` |
| `src/pages/Dashboard.tsx` | Ajouter `useIsMobile()` + rendu conditionnel `MobileDashboardPage` |
| `src/pages/Settings.tsx` | Ajouter `useIsMobile()` + rendu conditionnel `MobileSettingsPage` |

---

## Logique d'Intégration (Exemple Offers.tsx)

```typescript
import { useIsMobile } from "@/hooks/use-mobile";
import MobileOffersPage from "@/components/mobile/pages/MobileOffersPage";

const Offers = () => {
  const isMobile = useIsMobile();
  
  // ... hooks existants
  
  if (isMobile) {
    return (
      <MobileOffersPage 
        offers={filteredOffers}
        onSearch={setSearchTerm}
        onFilterChange={setActiveTab}
        onDeleteOffer={handleDeleteOffer}
        // ... autres props
      />
    );
  }
  
  // Rendu desktop actuel
  return (
    <PageTransition>
      ...
    </PageTransition>
  );
};
```

---

## Composants Existants à Utiliser

Les composants mobiles suivants sont déjà créés et prêts :
- `MobileOfferCard` - Card offre avec swipe
- `MobileClientCard` - Card client avec swipe
- `MobileContractCard` - Card contrat avec swipe
- `MobileSwipeCard` - Composant de base swipeable
- `MobileFilterSheet` - Bottom drawer pour filtres
- `MobileSearchSheet` - Recherche plein écran
- `MobileFAB` - Bouton action flottant

---

## Ordre d'Implémentation

1. **MobileOffersPage** - La plus utilisée
2. **MobileContractsPage** - Similaire structure
3. **MobileSettingsPage** - Navigation type réglages
4. **MobileDashboardPage** - Adaptation des KPIs

---

## Résultat Attendu

Après implémentation, l'application sur mobile aura une vraie expérience native :
- Cards swipeable pour les actions rapides
- Filtres via bottom drawer (pas des onglets qui débordent)
- FAB pour les actions principales
- Navigation fluide type application iOS/Android
- Plus de tableaux avec colonnes qui débordent

