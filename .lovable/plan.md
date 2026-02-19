

# Affichage de la remise sur les prix individuels et correction du total

## Probleme

1. **Double soustraction** : `totalMonthly` en DB = 2 767,22 euros (deja remise). Le composant soustrait encore `discountAmount` (208,29 euros), affichant 2 558,93 euros (faux).
2. **Prix individuels** : Les mensualites par equipement ne montrent pas la remise -- pas de prix barre ni de montant remise.

## Corrections

### Fichier : `src/components/offers/CommercialOffer.tsx`

#### 1. Corriger le calcul du total (lignes 547-557)

Le `totalMonthly` est DEJA la mensualite apres remise. Il ne faut plus soustraire :

```
// AVANT (faux - double soustraction)
let displayMonthlyPayment = totalMonthly;
const monthlyBeforeDiscount = displayMonthlyPayment;
if (hasDiscount) {
  displayMonthlyPayment = displayMonthlyPayment - discountAmount;
}

// APRES (correct)
let displayMonthlyPayment = totalMonthly; // deja remise
const monthlyBeforeDiscount = monthlyPaymentBeforeDiscount || totalMonthly;
// Pas de soustraction supplementaire
```

#### 2. Appliquer la remise proportionnelle aux lignes d'equipement (lignes 502-531)

Calculer un ratio de remise et afficher pour chaque equipement :
- Le prix original barre
- Le prix remise en dessous

```
const hasActiveDiscount = hasDiscount && monthlyPaymentBeforeDiscount > 0;
const discountRatio = hasActiveDiscount
  ? totalMonthly / monthlyPaymentBeforeDiscount
  : 1;

// Par ligne d'equipement :
const originalMonthly = item.monthlyPayment / discountRatio; // prix d'origine
const discountedMonthly = item.monthlyPayment; // prix remise (deja en DB)
```

Affichage par ligne :
- Prix unitaire original barre + prix unitaire remise
- Total ligne original barre + total ligne remise

#### 3. Corriger le bloc "Remise commerciale" (lignes 632-638)

Utiliser `monthlyBeforeDiscount` = `monthlyPaymentBeforeDiscount` (la prop) au lieu de la valeur calculee localement :

```
// Mensualite avant remise : utiliser la prop
{formatCurrency(monthlyBeforeDiscount)} // = monthlyPaymentBeforeDiscount = 2975.50
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/CommercialOffer.tsx` | Supprimer la double soustraction, ajouter prix barres individuels, corriger le bloc remise |

## Resultat attendu

Pour chaque equipement :
- ~~899,00 euros~~ -> 836,xx euros HTVA/mois (prix remise)

Bloc total :
- "Mensualite avant remise : ~~2 975,50 euros~~"
- "Remise : -208,29 euros"
- Total affiche : **2 767,22 euros** (correct, sans double soustraction)

