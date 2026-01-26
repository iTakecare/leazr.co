

# Plan : Application de la typographie WinBroker à Leazr

## Objectif

Appliquer la même typographie fine et légère de WinBroker dans toute l'application Leazr. Les polices doivent être plus fines (`font-normal`/`font-medium` au lieu de `font-semibold`/`font-bold`) et les tailles réduites.

---

## Analyse comparative

| Élément | Leazr actuel | WinBroker cible |
|---------|--------------|-----------------|
| Titres de page | `text-2xl font-semibold` | `text-xl font-medium` |
| Sous-titres | `text-sm text-muted-foreground` | `text-xs text-muted-foreground` |
| Valeurs KPI | `text-2xl font-semibold` | `text-xl font-medium` |
| Labels KPI | `text-sm font-medium` | `text-xs font-normal` |
| Titres de cartes | `text-lg font-semibold` | `text-sm font-medium` |
| Tableau - headers | `font-bold` | `font-medium text-sm` |
| Tableau - cellules | `font-semibold` / `font-bold` | `font-normal` / `font-medium` |
| Sidebar labels | `text-sm font-semibold` | `text-xs font-medium` |

---

## Fichiers à modifier

### 1. Composants UI de base (style global)

| Fichier | Modifications |
|---------|---------------|
| `src/components/ui/card.tsx` | `CardTitle`: `text-lg font-semibold` → `text-sm font-medium` |
| `src/components/page-header.tsx` | Titre: `text-2xl font-semibold` → `text-xl font-medium` |
| `src/components/dashboard/StatCard.tsx` | Valeurs: `text-2xl font-semibold` → `text-xl font-medium` |

### 2. Dashboard (page principale)

| Fichier | Modifications |
|---------|---------------|
| `src/components/dashboard/CompanyDashboard.tsx` | Réduire toutes les tailles et weights |

### 3. Sidebar

| Fichier | Modifications |
|---------|---------------|
| `src/components/layout/Sidebar.tsx` | Labels et titres plus fins |

### 4. CSS global (optionnel mais recommandé)

| Fichier | Modifications |
|---------|---------------|
| `src/index.css` | Ajouter un style de base pour la typographie fine |

---

## Détail des modifications

### `src/components/ui/card.tsx`

```tsx
// CardTitle - ligne 39
const CardTitle = ... (
  <h3 className={cn(
    "text-sm font-medium leading-none tracking-tight",  // Avant: text-lg font-semibold
    className
  )} />
))

// CardDescription - ligne 53
const CardDescription = ... (
  <p className={cn("text-xs text-muted-foreground", className)} />  // Avant: text-sm
))
```

### `src/components/page-header.tsx`

```tsx
// Ligne 11
<h1 className="text-xl font-medium tracking-tight text-foreground">{title}</h1>  // Avant: text-2xl font-semibold

// Ligne 13
<p className="text-xs text-muted-foreground">{description}</p>  // Avant: text-sm
```

### `src/components/dashboard/StatCard.tsx`

```tsx
// Titre - ligne 29
<CardTitle className="text-xs font-normal text-muted-foreground">  // Avant: text-sm font-medium

// Valeur - ligne 37
<div className="text-xl font-medium">{value}</div>  // Avant: text-2xl font-semibold

// Description - ligne 39
<p className="text-[10px] text-muted-foreground mt-1">  // Avant: text-xs
```

### `src/components/dashboard/CompanyDashboard.tsx`

```tsx
// Header - ligne 151
<h1 className="text-xl font-medium text-foreground">  // Avant: text-2xl font-semibold

// Description - ligne 154
<p className="text-xs text-muted-foreground">  // Avant: text-sm

// KPI Cards - lignes 202-203
<p className="text-xs font-normal text-muted-foreground">CA Total</p>  // Avant: text-sm font-medium
<p className="text-xl font-medium text-foreground">  // Avant: text-2xl font-semibold

// CardTitle tableau - ligne 263
<CardTitle className="text-base font-medium">  // Avant: text-xl font-bold

// TableHead - ligne 270
<TableHead className="font-medium text-xs">  // Avant: font-bold

// TableCell font-semibold -> font-normal partout
// TableCell font-bold -> font-medium partout

// TOTAL row - lignes 331-340
<TableCell className="font-medium text-base">  // Avant: font-bold text-lg

// Section headers (Contrats Réalisés, etc.) - réduire les tailles
```

### `src/components/layout/Sidebar.tsx`

```tsx
// Company name - ligne 134
<h1 className="text-xs font-medium text-white truncate">  // Avant: text-sm font-semibold

// Admin label - ligne 135
<p className="text-[10px] text-sidebar-foreground/60">  // Avant: text-xs

// Navigation label - ligne 159
<p className="text-[9px] font-medium uppercase text-sidebar-foreground/40">  // Avant: text-[10px] font-semibold
```

### `src/index.css` - Optionnel

Ajouter des styles de base pour une typographie plus fine globalement :

```css
@layer base {
  body {
    @apply bg-background text-foreground antialiased;
    font-weight: 400;
    font-size: 14px;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-weight: 500;
  }
}
```

---

## Résumé des changements typographiques

| Pattern actuel | Nouveau pattern |
|----------------|-----------------|
| `font-bold` | `font-medium` |
| `font-semibold` | `font-normal` ou `font-medium` |
| `text-2xl` | `text-xl` |
| `text-xl` | `text-base` ou `text-lg` |
| `text-lg` | `text-sm` |
| `text-sm` | `text-xs` |
| `text-xs` | `text-[10px]` ou `text-[11px]` |

---

## Fichiers impactés

| Fichier | Priorité |
|---------|----------|
| `src/components/ui/card.tsx` | Haute (affecte toute l'app) |
| `src/components/page-header.tsx` | Haute |
| `src/components/dashboard/StatCard.tsx` | Haute |
| `src/components/dashboard/CompanyDashboard.tsx` | Haute |
| `src/components/layout/Sidebar.tsx` | Moyenne |
| `src/index.css` | Optionnelle |

---

## Résultat attendu

- Titres de page plus discrets et élégants
- Valeurs numériques lisibles mais pas "criantes"
- Aspect général plus léger et professionnel
- Cohérence avec le design WinBroker

