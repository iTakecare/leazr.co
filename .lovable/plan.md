

# Plan : Corriger le Bouton "+" de la Bottom Nav

## Problème Identifié

En observant la capture d'écran, le bouton "+" central a deux problèmes :

1. **Couleur terne** : Le bouton utilise `bg-primary` mais avec `border-4 border-background` (bordure grise), ce qui le rend visuellement moins bleu et moins contrasté
2. **Partiellement coupé** : Le bouton remonte avec `-mt-6` mais une partie haute est masquée

## Solution

Modifier le bouton pour qu'il soit :
- **Bleu vif et visible** : Utiliser une couleur bleue explicite au lieu de `bg-primary`
- **Entièrement visible** : Ajuster le positionnement et ajouter une bordure blanche plus épaisse

## Fichier à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/mobile/MobileBottomNav.tsx` | Corriger le style du bouton "+" |

## Modifications Techniques

### Avant (lignes 146-158) :
```tsx
<Link
  key={item.href}
  to={item.href}
  className="relative flex items-center justify-center -mt-6"
>
  <motion.div
    whileTap={{ scale: 0.9 }}
    className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-xl border-4 border-background"
  >
    <Icon className="h-7 w-7" />
  </motion.div>
</Link>
```

### Après :
```tsx
<Link
  key={item.href}
  to={item.href}
  className="relative flex items-center justify-center -mt-8"
>
  <motion.div
    whileTap={{ scale: 0.9 }}
    className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-2xl border-[5px] border-white"
    style={{ boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}
  >
    <Icon className="h-7 w-7" />
  </motion.div>
</Link>
```

## Changements Clés

| Propriété | Avant | Après |
|-----------|-------|-------|
| Couleur fond | `bg-primary` (variable) | `bg-blue-600` (bleu explicite) |
| Couleur texte | `text-primary-foreground` | `text-white` |
| Bordure | `border-4 border-background` (grise) | `border-[5px] border-white` (blanche) |
| Ombre | `shadow-xl` | `shadow-2xl` + ombre bleue custom |
| Margin top | `-mt-6` | `-mt-8` (remonte plus haut) |

## Résultat Attendu

Le bouton "+" sera :
- Bleu vif (#2563EB) et clairement visible
- Entièrement affiché sans être coupé
- Bordure blanche épaisse pour un contraste maximal
- Ombre bleue pour un effet "flottant" professionnel

