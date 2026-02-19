

# Correction du montant finance et de la marge dans le Recapitulatif financier

## Probleme

Dans la carte "Recapitulatif financier" du calculateur :
- **Montant total finance** (96 294,50 euros) ne tient pas compte de la remise -- il devrait etre recalcule via Grenke avec la mensualite remisee
- **Marge apres remise** (ligne 440) utilise `displayedMarginAmount - discountAmount` ce qui est faux -- elle devrait etre `montant finance apres remise - prix d'achat total`
- La carte "Impact sur la marge" affiche la bonne valeur car elle utilise la formule Grenke correctement

## Correction

### Fichier : `src/components/offer/FinancialSummary.tsx`

#### 1. Recalculer le montant finance quand une remise est active (lignes 363-371)

Quand `discountData` est present et actif, le montant finance affiche doit etre recalcule :

```
montant finance apres remise = mensualite remisee x 100 / coefficient
```

Au lieu d'afficher `totalFinancedAmount` tel quel, afficher le montant recalcule.

#### 2. Corriger la marge apres remise (ligne 440)

Remplacer `displayedMarginAmount - discountData.discountAmount` par :

```
marge apres remise = montant finance apres remise - totalPurchasePrice
```

Cela garantit la coherence avec la carte "Impact sur la marge" qui affiche deja la bonne valeur.

#### 3. Meme correction pour le bloc `offerData` (lignes 178-186)

Si `discountData` est passe dans le bloc `offerData`, appliquer la meme logique de recalcul.

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/offer/FinancialSummary.tsx` | Recalculer montant finance et marge quand remise active, dans les deux branches (calculations et offerData) |

## Resultat attendu

- **Montant total finance** : passe de 96 294,50 euros a environ 91 472,17 euros (2826,73 x 100 / 3.09)
- **Marge apres remise** : coherente avec la carte "Impact sur la marge" (32 192,17 euros au lieu de la valeur actuelle incorrecte)
