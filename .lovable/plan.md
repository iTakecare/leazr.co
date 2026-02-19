

# Fix: Marge incorrecte dans la carte "Impact sur la marge"

## Probleme identifie

Le `coefficient` passe au composant `DiscountInput` vaut `0` en mode edition d'offre. Cela rend `canCalculateRealMargin` faux, et le composant retombe sur l'ancien calcul incorrect (`margin - discountAmount`).

Le vrai coefficient est disponible dans `globalMarginAdjustment.newCoef` ou `calculations.coefficient`, mais n'est pas utilise comme fallback.

## Correction

### Fichier : `src/pages/CreateOffer.tsx` (ligne 974)

Remplacer :
```typescript
coefficient={Number(coefficient) || 0}
```

Par :
```typescript
coefficient={Number(coefficient) || Number(globalMarginAdjustment.newCoef) || calculations?.coefficient || 0}
```

Cela garantit qu'un coefficient valide est toujours transmis au composant, meme en mode edition.

### Resultat attendu

La carte "Impact sur la marge" affichera correctement :

```
Impact sur la marge

Marge avant remise : 37 014,50 euros (62,44%)
Marge apres remise : 33 015,50 euros (55,70%)
```

Au lieu des anciennes valeurs incorrectes (24 537 euros sans pourcentage).

