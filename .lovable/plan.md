
# Correction du calcul de marge apres remise dans DiscountInput

## Probleme

Actuellement, la marge apres remise est calculee comme :
```
Marge apres remise = Marge avant remise - Montant de la remise
```

C'est faux. Quand on reduit la mensualite, le **montant finance** change aussi (formule Grenke : `mensualite x 100 / coefficient`), donc la marge doit etre recalculee :

```
Nouveau montant finance = nouvelle mensualite x 100 / coefficient
Nouvelle marge (euros) = nouveau montant finance - prix d'achat total
Nouvelle marge (%) = nouvelle marge / prix d'achat total x 100
```

Exemple concret :
- Mensualite d'origine : 2 975,50 euros, coefficient 3,27, PA total : 22 303 euros
- Montant finance d'origine : 2 975,50 x 100 / 3,27 = 90 994,50 euros
- Marge d'origine : 90 994,50 - 22 303 = 68 691,50 euros
- Remise 10% : nouvelle mensualite = 2 677,95 euros
- Nouveau montant finance : 2 677,95 x 100 / 3,27 = 81 895,00 euros
- Nouvelle marge : 81 895 - 22 303 = 59 592 euros (et non pas 68 691 - 297 = 68 394 euros)

## Solution

### Fichier modifie : `src/components/offer/DiscountInput.tsx`

1. **Ajouter deux nouvelles props** :
   - `coefficient` (number) : le coefficient du bailleur
   - `totalPurchasePrice` (number) : le prix d'achat total des equipements

2. **Recalculer la marge correctement** dans la section "Impact sur la marge" :
   - Montant finance apres remise = mensualite remisee x 100 / coefficient
   - Marge apres remise (euros) = montant finance apres remise - prix d'achat total
   - Marge apres remise (%) = marge euros / prix d'achat total x 100

3. **Afficher la marge en euros ET en pourcentage** (avant et apres remise)

### Fichier modifie : `src/pages/CreateOffer.tsx`

Passer les nouvelles props au composant `DiscountInput` :
- `coefficient` depuis le state existant
- `totalPurchasePrice` depuis `calculations.totalPurchasePrice`

### Resultat attendu dans l'affichage

```
Impact sur la marge

Marge avant remise : 37 014,50 euros (62,44%)
Marge apres remise : 33 015,50 euros (55,70%)
```

Avec avertissement si la marge passe en negatif.
