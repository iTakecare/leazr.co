

# Plan : Correction de la marge et du numero de demande pour les packs

## Probleme 1 : Marge incorrecte a la creation

**Cause racine** : Dans l'Edge Function `create-product-request`, l'estimation initiale du montant finance est incorrecte (ligne 351) :
```
// ACTUEL (FAUX) : totalMonthlyPayment × 3.53 = 423€ (au lieu de ~3400€)
let estimatedFinancedAmount = totalMonthlyPayment * 3.53;
```

Cela provoque un mauvais coefficient initial. L'iteration converge ensuite correctement (vers 3.24), MAIS les anciennes versions de l'Edge Function stockaient le mauvais coefficient (3.53), ce qui donne un montant finance de 3396€ au lieu de 3700€.

Le coefficient 3.53 s'applique pour les montants 500-2500€, mais le montant reel finance est ~3700€ (tranche 2500-5000€, coefficient 3.24). L'apercu Vue d'ensemble utilise le coefficient stocke sur l'offre pour recalculer via Grenke → marge incorrecte (39.7% au lieu de 52.2%).

Quand on ouvre le calculateur (Modifier), celui-ci recharge les tranches du leaser et recalcule avec le BON coefficient → marge correcte.

**Correction** : Modifier l'Edge Function pour :
- Corriger l'estimation initiale : `totalMonthlyPayment * (100 / 3.53)` au lieu de `* 3.53`
- S'assurer que le coefficient final (apres convergence) est bien stocke sur l'offre ET utilise pour les prix de vente des equipements
- Mettre a jour les `selling_price` et `margin` de chaque equipement avec le coefficient final

## Probleme 2 : Pas de numero de demande

**Cause racine** : L'Edge Function `create-product-request` ne genere pas de `dossier_number`. La generation existe dans `src/services/offers/index.ts` (ligne 150-155) mais uniquement pour les offres creees via le calculateur admin.

**Correction** : Ajouter la generation de `dossier_number` dans l'Edge Function avec le meme format (`ITC-YYYY-OFF-XXXX`).

## Probleme 3 : Corriger les offres existantes

77 offres stockees avec coefficient 3.53 sont potentiellement incorrectes (si le montant finance reel tombe dans une tranche differente). Migration SQL pour recalculer.

## Fichiers impactes

| Fichier | Action |
|---|---|
| `supabase/functions/create-product-request/index.ts` | Corriger estimation initiale, ajouter generation dossier_number, recalculer selling_price/margin equipements avec coefficient final |
| Migration SQL | Recalculer coefficient, financed_amount, margin pour les offres existantes sans dossier_number ; mettre a jour selling_price des equipements |

