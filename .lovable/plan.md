

# Plan : Interface Mobile Simplifiée pour Leazr

## Diagnostic du Probleme

L'erreur `TypeError: null is not an object (evaluating 'dispatcher.useContext')` est causee par un conflit entre plusieurs librairies qui utilisent React de maniere incompatible :
- `dexie-react-hooks` (v4.2.0) dans les dependances
- `next-themes` pour la gestion du theme
- Le lazy loading des composants mobiles

Le probleme survient quand `MobileLayout` est charge avec ses dependances sur `dexie`.

## Solution Simplifiee

La solution consiste a :
1. Supprimer les dependances problematiques (`dexie-react-hooks`)
2. Simplifier les composants mobiles en evitant les imports circulaires
3. Integrer le MobileLayout directement dans Layout.tsx sans lazy loading excessif

---

## Fichiers a Modifier

### 1. Layout.tsx - Integration Mobile Directe

Modifier le composant Layout pour integrer directement la detection mobile et le rendu conditionnel, sans lazy loading qui cause des conflits de contexte.

```typescript
// Logique simplifiee
const isMobile = useIsMobile();

if (isMobile) {
  return <MobileLayoutWrapper>{children}</MobileLayoutWrapper>;
}
return <DesktopLayout>{children}</DesktopLayout>;
```

### 2. MobileLayout.tsx - Simplification

Supprimer le lazy loading et les dependances sur dexie. Importer directement les composants mobiles.

### 3. OfflineIndicator.tsx - Deja Simplifie

Ce fichier utilise deja un hook reseau simple sans dexie - pas de modification necessaire.

### 4. package.json - Supprimer dexie-react-hooks

Retirer `dexie-react-hooks` des dependances car il cause le conflit React. Garder `dexie` pour le stockage offline (utilisation directe sans hooks React).

### 5. offlineStorage.ts - Adaptation

Modifier pour utiliser dexie directement sans les hooks React.

---

## Fichiers Concernes

| Fichier | Action |
|---------|--------|
| `src/components/layout/Layout.tsx` | Ajouter detection mobile et rendu conditionnel |
| `src/components/mobile/MobileLayout.tsx` | Simplifier - supprimer lazy loading |
| `package.json` | Retirer `dexie-react-hooks` |
| `src/hooks/useOfflineSync.ts` | Adapter sans dexie-react-hooks |

---

## Implementation Detaillee

### Etape 1 : Mise a jour de Layout.tsx

```typescript
import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import LeazrSaaSSidebar from "./LeazrSaaSSidebar";
import MobileLayout from "@/components/mobile/MobileLayout";

const Layout = ({ children }) => {
  const location = useLocation();
  const { isSuperAdmin, isLoading } = useAuth();
  const isMobile = useIsMobile();

  const isLeazrSaaSPage = location.pathname.startsWith('/admin/leazr-saas-');
  const isLeazrSaaSAdmin = !isLoading && isSuperAdmin?.() || false;
  const shouldUseLeazrSaaSSidebar = isLeazrSaaSAdmin && isLeazrSaaSPage;

  // Rendu mobile
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // Rendu desktop
  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {shouldUseLeazrSaaSSidebar ? <LeazrSaaSSidebar /> : <Sidebar />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};
```

### Etape 2 : Simplification de MobileLayout.tsx

```typescript
import React from "react";
import { useLocation } from "react-router-dom";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import MobilePageContainer from "./MobilePageContainer";
import OfflineIndicator from "./OfflineIndicator";

const MobileLayout = ({ children }) => {
  const location = useLocation();

  // Extraction du slug et role depuis l'URL
  const getCompanySlugAndRole = () => {
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
    return {
      companySlug: pathMatch?.[1] || null,
      userRole: pathMatch?.[2] || 'admin',
    };
  };

  const { companySlug, userRole } = getCompanySlugAndRole();

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <MobileHeader companySlug={companySlug} />
      <MobilePageContainer hasHeader hasBottomNav>
        {children}
      </MobilePageContainer>
      <MobileBottomNav companySlug={companySlug} userRole={userRole} />
    </div>
  );
};

export default MobileLayout;
```

### Etape 3 : Adaptation de useOfflineSync.ts

Utiliser dexie directement au lieu de dexie-react-hooks :

```typescript
import { offlineDb } from "@/lib/offlineStorage";
import { useState, useEffect, useCallback } from "react";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Charger le compte des actions en attente
  const loadPendingCount = useCallback(async () => {
    try {
      const count = await offlineDb.pendingActions.where('synced').equals(0).count();
      setPendingCount(count);
    } catch (error) {
      console.warn('IndexedDB not available:', error);
    }
  }, []);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  return { pendingCount, isSyncing, sync: loadPendingCount };
}
```

---

## Resultat Attendu

Apres ces modifications :

1. **Sur mobile (< 768px)** : L'application affiche automatiquement :
   - Header compact avec menu hamburger, logo, notifications et recherche
   - Contenu adapte avec padding pour header et bottom nav
   - Bottom navigation avec 5 boutons (Accueil, Demandes, Creer, Contrats, Profil)
   - Indicateur offline quand deconnecte

2. **Sur desktop (>= 768px)** : L'application conserve son layout actuel avec sidebar

3. **Pas d'erreur** : En evitant dexie-react-hooks et le lazy loading problematique

---

## Navigation Mobile

```text
+--------------------------------------------------+
|  ≡    📷          LEAZR           🔔  🔍        |  <- Header 56px
+--------------------------------------------------+
|                                                   |
|                                                   |
|              Contenu de la page                   |
|                                                   |
|                                                   |
+--------------------------------------------------+
|  🏠     📋     [+]     📁     👤                |  <- Bottom Nav 64px
| Accueil Demandes Creer Contrats Profil          |
+--------------------------------------------------+
```

---

## Points Techniques

- **Pas de lazy loading** sur MobileLayout pour eviter les conflits de contexte React
- **Imports directs** des composants mobiles
- **dexie sans hooks** pour le stockage offline (utilisation directe de la base IndexedDB)
- **Hook useIsMobile** existant reutilise sans modification

