

## Problème

La `ClientSidebar` a un fond **blanc** (`bg-white/95`), mais le composant `SidebarMenuItem` utilise des couleurs de texte conçues pour un fond **sombre** :
- Inactif : `text-sidebar-foreground/70` (blanc cassé) + `hover:text-white`
- Actif : `bg-primary/20 text-white`
- Icônes : `text-sidebar-foreground/70` (blanc cassé)

Résultat : texte blanc sur fond blanc = invisible.

## Solution

Modifier `SidebarMenuItem.tsx` pour accepter une prop `variant` (`"dark" | "light"`) et adapter les couleurs en conséquence. La `ClientSidebar` passera `variant="light"`, la `Sidebar` admin gardera le comportement actuel (`"dark"` par défaut).

### Fichiers modifiés

**1. `src/components/layout/SidebarMenuItem.tsx`**
- Ajouter prop `variant?: "dark" | "light"` (défaut `"dark"`)
- Variante `light` :
  - Inactif : `text-gray-700 hover:bg-gray-100 hover:text-gray-900`
  - Actif : `bg-primary/10 text-primary`
  - Icônes inactives : `text-gray-500`, actives : `text-primary`
  - Badge : `bg-primary/10 text-primary`

**2. `src/components/layout/ClientSidebar.tsx`**
- Passer `variant="light"` à chaque `<SidebarMenuItem>`.

