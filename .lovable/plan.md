

# Plan de refonte visuelle : Adopter le look WinBroker

## Objectif

Adapter l'interface de Leazr pour correspondre au style épuré et professionnel de WinBroker, visible dans les captures d'écran fournies.

---

## Analyse du design cible (WinBroker)

### Palette de couleurs

| Element | Couleur WinBroker | Couleur Leazr actuelle |
|---------|-------------------|------------------------|
| Sidebar fond | `#1a1f2e` (slate foncé) | Blanc avec gradient |
| Sidebar texte | `#e2e8f0` (gris clair) | Gris foncé |
| Sidebar actif | Fond bleu subtil `#1e3a5f` | Couleurs vives multiples |
| Background page | `#f8fafc` (gris très clair) | `#fafbfc` (similaire) |
| Cartes | `#ffffff` (blanc pur) | Gradients colorés |
| Primary | `#1e52f1` (bleu profond) | `#3b82f6` (bleu) |
| Accents | Orange `#f97316` pour highlights | Multiples couleurs |

### Typographie

- Police : Inter (deja utilisee)
- Titres : font-semibold (pas bold)
- Sous-titres : text-muted-foreground
- Taille H1 : text-2xl

### Composants

- **Boutons** : Coins arrondis moderés, pas de scale hover, ombres légères
- **Cartes** : Blanches pures, bordures très subtiles, ombres légères
- **Sidebar** : Fond sombre, items avec icônes fines, état actif avec fond bleu subtil
- **Tabs** : Style underline, pas de fond

---

## Fichiers a modifier

### 1. Variables CSS (`src/index.css`)

Mise a jour des variables de couleurs :

```css
:root {
  --background: 220 14% 96%;        /* #f5f7fa - fond page */
  --foreground: 222 47% 11%;        /* #0f172a - texte */
  --card: 0 0% 100%;                /* blanc pur */
  --card-foreground: 222 47% 11%;
  --primary: 228 76% 52%;           /* #1e52f1 - bleu WinBroker */
  --primary-foreground: 0 0% 100%;
  --muted: 220 14% 96%;
  --muted-foreground: 215 16% 47%;  /* #64748b */
  --border: 220 13% 91%;            /* #e2e8f0 */
  
  /* Nouvelles variables pour sidebar */
  --sidebar: 222 47% 11%;           /* #0f172a - fond sidebar */
  --sidebar-foreground: 210 40% 98%;
  --sidebar-border: 217 33% 17%;    /* #1e293b */
  --sidebar-accent: 217 91% 60%;    /* bleu pour actif */
}
```

### 2. Configuration Tailwind (`tailwind.config.ts`)

Ajouter les couleurs sidebar et ajuster les ombres :

```typescript
colors: {
  sidebar: {
    DEFAULT: 'hsl(var(--sidebar))',
    foreground: 'hsl(var(--sidebar-foreground))',
    border: 'hsl(var(--sidebar-border))',
    accent: 'hsl(var(--sidebar-accent))',
    muted: 'hsl(222 47% 18%)',
  },
  // Nouvelle palette WinBroker
  winbroker: {
    primary: '#1e52f1',
    sidebar: '#0f172a',
    background: '#f5f7fa',
  }
}
```

### 3. Composant Button (`src/components/ui/button.tsx`)

Simplifier les variants pour un look plus clean :

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ... sizes inchangees
    },
  }
)
```

**Changements cles** :
- Retirer les gradients
- Retirer `hover:scale-105`
- Simplifier les ombres
- Coins arrondis `rounded-lg` au lieu de `rounded-md`

### 4. Sidebar Admin (`src/components/layout/Sidebar.tsx`)

Refonte complete pour adopter le style sombre :

```tsx
<div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
  {/* Header avec logo */}
  <div className="p-4 border-b border-sidebar-border">
    <div className="flex items-center gap-3">
      <CompanyLogo logoSize="sm" />
      <div>
        <h1 className="text-sm font-semibold text-white">{companyName}</h1>
        <p className="text-xs text-sidebar-foreground/60">Administration</p>
      </div>
    </div>
  </div>

  {/* Navigation sections */}
  <nav className="flex-1 p-3">
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase text-sidebar-foreground/40 px-3 mb-2">
        Navigation
      </p>
      <ul className="space-y-1">
        {/* Menu items */}
      </ul>
    </div>
    
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase text-sidebar-foreground/40 px-3 mb-2">
        Administration
      </p>
      <ul className="space-y-1">
        {/* Admin items */}
      </ul>
    </div>
  </nav>

  {/* User section */}
  <div className="p-4 border-t border-sidebar-border">
    <SidebarUserSection collapsed={isCollapsed} darkMode />
  </div>
</div>
```

### 5. Menu Item Sidebar (`src/components/layout/SidebarMenuItem.tsx`)

Style epure avec fond sombre :

```tsx
<button
  onClick={handleClick}
  className={cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
    active
      ? "bg-primary/20 text-white"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
  )}
>
  <item.icon className="h-4 w-4" />
  {!collapsed && <span>{item.label}</span>}
</button>
```

**Changements** :
- Toutes les icônes en blanc/gris clair
- Etat actif : fond bleu subtil, pas de couleurs vives
- Pas de bordure gauche coloree
- Pas d'effets de scale

### 6. Composant Card (`src/components/ui/card.tsx`)

Simplifier pour un look plus propre :

```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
)
```

### 7. Dashboard (`src/components/dashboard/CompanyDashboard.tsx`)

Simplifier les KPI cards et retirer les gradients colores :

```tsx
{/* Header simplifie */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <h1 className="text-2xl font-semibold text-foreground">
      Tableau de bord
    </h1>
    <p className="text-sm text-muted-foreground">
      Bienvenue sur votre espace {companyName}
    </p>
  </div>
  {/* Actions */}
</div>

{/* KPI Cards blanches */}
<Card className="bg-card border-border/50">
  <CardContent className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Demandes en cours</p>
        <p className="text-2xl font-semibold text-foreground">0</p>
        <p className="text-xs text-muted-foreground mt-1">0 nouvelles cette semaine</p>
      </div>
      <div className="p-2 rounded-lg bg-primary/10">
        <FileText className="w-5 h-5 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>
```

### 8. Tabs (`src/components/ui/tabs.tsx`)

Style underline comme WinBroker :

```tsx
const TabsList = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-center gap-1 bg-transparent border-b border-border",
      className
    )}
    {...props}
  />
))

const TabsTrigger = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
      "border-b-2 border-transparent -mb-px",
      "hover:text-foreground",
      "data-[state=active]:text-foreground data-[state=active]:border-primary",
      className
    )}
    {...props}
  />
))
```

### 9. Page Header (`src/components/page-header.tsx`)

Garder simple et propre :

```tsx
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
```

### 10. StatCard Dashboard (`src/components/dashboard/StatCard.tsx`)

Version simplifiee sans gradients :

```tsx
<Card className="bg-card border-border/50 hover:shadow-md transition-shadow">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      {title}
    </CardTitle>
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-semibold">{value}</div>
    {description && (
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    )}
  </CardContent>
</Card>
```

---

## Resume des fichiers a modifier

| Fichier | Type de modification |
|---------|---------------------|
| `src/index.css` | Nouvelles variables CSS |
| `tailwind.config.ts` | Couleurs sidebar + ombres |
| `src/components/ui/button.tsx` | Simplifier variants |
| `src/components/ui/card.tsx` | Retirer gradients |
| `src/components/ui/tabs.tsx` | Style underline |
| `src/components/layout/Sidebar.tsx` | Refonte fond sombre |
| `src/components/layout/SidebarMenuItem.tsx` | Style epure |
| `src/components/layout/SidebarUserSection.tsx` | Adapter au theme sombre |
| `src/components/layout/BrokerSidebar.tsx` | Appliquer meme style |
| `src/components/layout/AmbassadorSidebar.tsx` | Appliquer meme style |
| `src/components/dashboard/CompanyDashboard.tsx` | Retirer gradients |
| `src/components/dashboard/StatCard.tsx` | Simplifier |
| `src/components/page-header.tsx` | Ajustements mineurs |

---

## Resultat attendu

Apres ces modifications, l'interface Leazr aura :

- **Sidebar sombre** avec navigation claire et epuree
- **Cartes blanches** sans gradients colores
- **Boutons simples** sans effets exageres
- **Typographie propre** avec hierarchie claire
- **Palette coherente** : bleu primaire, gris neutres, accents orange si necessaire
- **Ombres subtiles** pour la profondeur sans surcharge visuelle

Le look sera moderne, professionnel et coherent avec le design WinBroker tout en conservant l'identite Leazr.

