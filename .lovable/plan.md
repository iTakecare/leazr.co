

# Fix: Alignement uniforme à gauche de la colonne Activité

## Diagnostic
La cellule a `!text-left` mais le `<div>` interne utilise `flex items-center` sans `justify-start` explicite. Selon la largeur du contenu vs la cellule, le texte peut sembler décalé à droite. De plus, le `<TableHead>` pour cette colonne n'a pas de `text-left`.

## Corrections dans `src/components/offers/OffersTable.tsx`

1. **Ligne 387** - Ajouter `text-left` au header de la colonne Activité
2. **Ligne 533** - Ajouter `justify-start` au `<div>` flex interne de la cellule pour forcer l'alignement à gauche

```tsx
// Header (ligne 387)
className="text-[9px] w-[95px] hidden lg:table-cell text-left"

// Div interne (ligne 533)  
<div className="flex items-center justify-start gap-1.5">
```

