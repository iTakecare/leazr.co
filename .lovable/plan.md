

# Fix: Alignement incohérent de la colonne Activité

## Diagnostic
Le problème n'est pas le `text-left` -- c'est le **point animé** (indicateur d'activité récente < 24h). Il est affiché conditionnellement : les lignes avec le point ont le texte décalé à droite par l'espace du point + gap, tandis que les lignes sans point commencent au bord gauche.

## Solution
Toujours réserver l'espace pour le point, même quand il n'est pas visible. Remplacer le rendu conditionnel du point par un conteneur de taille fixe qui est soit visible soit invisible :

### Modification dans `src/components/offers/OffersTable.tsx` (lignes 534-539)

**Avant :**
```tsx
{offer.last_activity_at && (new Date().getTime() - new Date(offer.last_activity_at).getTime()) < 24 * 60 * 60 * 1000 && (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping ..."></span>
    <span className="relative ..."></span>
  </span>
)}
```

**Après :**
```tsx
<span className="relative flex h-2 w-2 shrink-0">
  {offer.last_activity_at && (new Date().getTime() - new Date(offer.last_activity_at).getTime()) < 24 * 60 * 60 * 1000 ? (
    <>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
    </>
  ) : null}
</span>
```

Le `<span>` externe de taille fixe (h-2 w-2 shrink-0) est toujours rendu, réservant l'espace. Le point animé est affiché à l'intérieur uniquement pour les activités récentes. Résultat : toutes les lignes ont le même alignement gauche.

