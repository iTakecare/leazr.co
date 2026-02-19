
# Correction de la remise commerciale : sauvegarde et affichage

## Probleme racine

La remise est sauvegardee en base comme metadata (`discount_amount=297.55`, `discount_type=percentage`, etc.) mais le champ `monthly_payment` n'est **jamais reduit**. En base : `monthly_payment = 2975.50` et `monthly_payment_before_discount = 2975.50` -- identiques.

Cela signifie que partout dans l'application (liste, detail, montant finance, marge), la mensualite utilisee est toujours la mensualite d'origine, et la remise n'a aucun effet reel sur les calculs affiches.

## Corrections

### 1. `src/pages/CreateOffer.tsx` (sauvegarde) - CORRECTION PRINCIPALE

Ligne 748 : `monthly_payment` est defini comme `totalMonthlyPayment` (la mensualite avant remise). Il faut soustraire la remise :

```
monthly_payment = globalDiscount.enabled
  ? totalMonthlyPayment - (globalDiscount.discountAmount || 0)
  : totalMonthlyPayment
```

De meme, le `financed_amount` (ligne 754) et la `margin` (ligne 759) doivent etre recalcules avec la mensualite remisee pour que la base reflète la realite financiere.

### 2. `src/components/offers/OffersTable.tsx` (liste des demandes)

Lignes 228-246 : Les calculs de `effectiveFinancedAmount`, `adjustedMonthlyPayment` et `marginInEuros` ne tiennent pas compte de la remise.

**Corrections :**
- `effectiveFinancedAmount` : si une remise est presente et que `monthly_payment` est deja la valeur remisee (apres correction 1), le montant finance sera automatiquement correct via la formule Grenke
- Pour les offres existantes deja en base avec l'ancien bug : ajouter un fallback qui soustrait `discount_amount` de la mensualite pour recalculer le montant finance
- `marginInEuros` : recalculer comme `effectiveFinancedAmount - total_purchase_price`
- `margin_percentage` : recalculer comme `marginInEuros / total_purchase_price * 100`
- Ligne 631 : la mensualite barree doit afficher `monthly_payment_before_discount`, et la mensualite finale doit afficher la mensualite remisee (verification que les deux sont bien differentes)

### 3. `src/components/offers/detail/FinancialSection.tsx` (detail Financier)

- Le calcul de `effectiveFinancedAmount` (lignes 227-228) utilise `totals.totalMonthlyPayment` qui vient des equipements (sans remise). Il faut soustraire la remise :

```
Si offer.discount_amount > 0 :
  mensualite effective = totals.totalMonthlyPayment - offer.discount_amount
  montant finance = mensualite effective * 100 / coefficient
```

- La carte "Montant finance" (ligne 420) affichera alors le bon montant
- La marge sera recalculee sur la base du montant finance remise

### 4. `src/components/ambassador/AmbassadorOfferSaveLogic.tsx` et `src/components/broker/calculator/BrokerCalculator.tsx`

Meme correction que pour CreateOffer : appliquer la remise au `monthly_payment` sauvegarde.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/CreateOffer.tsx` | Sauvegarder `monthly_payment` = mensualite - remise. Recalculer `financed_amount` et `margin` en consequence. |
| `src/components/offers/OffersTable.tsx` | Recalculer montant finance, marge euros et marge % en tenant compte de la remise pour les offres existantes. Corriger l'affichage barree/finale dans la colonne mensualite. |
| `src/components/offers/detail/FinancialSection.tsx` | Soustraire la remise de la mensualite avant le calcul du montant finance et de la marge. |
| `src/components/ambassador/AmbassadorOfferSaveLogic.tsx` | Appliquer la remise au monthly_payment sauvegarde. |
| `src/components/broker/calculator/BrokerCalculator.tsx` | Appliquer la remise au monthly_payment sauvegarde. |

## Resultat attendu

- **Sauvegarde** : `monthly_payment` en base = mensualite apres remise (ex: 2677.95), `monthly_payment_before_discount` = mensualite d'origine (ex: 2975.50)
- **Liste** : Mensualite d'origine barree (2975.50), mensualite remisee en dessous (2677.95), montant finance, marge euros et marge % recalcules
- **Detail Financier** : Montant finance = 2677.95 x 100 / 3.09 = 86 663.43 euros (et non 96 294.50), marge recalculee en consequence
- **Vue d'ensemble** : La marge globale et les totaux refletent la remise
