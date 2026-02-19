

# Restauration de la remise commerciale en mode edition

## Probleme

Quand on ouvre une offre existante en mode edition, les champs de remise (`discount_type`, `discount_value`, `discount_amount`, `monthly_payment_before_discount`) sont bien presents en base de donnees mais ne sont jamais recharges dans l'etat `globalDiscount`. Le toggle "Remise commerciale" reste donc decoche.

## Corrections

### 1. `src/pages/CreateOffer.tsx` - Charger la remise en mode edition

Apres le bloc qui charge l'acompte (ligne 426), ajouter le chargement de la remise :

```
// Charger la remise commerciale si presente
if (offer.discount_amount && offer.discount_amount > 0) {
  setGlobalDiscount({
    enabled: true,
    type: offer.discount_type || 'percentage',
    value: offer.discount_value || 0,
    discountAmount: offer.discount_amount,
    monthlyPaymentBeforeDiscount: offer.monthly_payment_before_discount || 0,
    monthlyPaymentAfterDiscount: (offer.monthly_payment_before_discount || 0) - offer.discount_amount,
  });
}
```

### 2. `src/pages/AmbassadorCreateOffer.tsx` - Meme correction

Apres le chargement des remarques (ligne 195), ajouter le meme bloc de restauration de la remise depuis `offerData`.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/CreateOffer.tsx` | Ajouter restauration du `globalDiscount` depuis l'offre chargee |
| `src/pages/AmbassadorCreateOffer.tsx` | Idem |

## Resultat attendu

En mode edition, si l'offre a une remise enregistree, le toggle "Remise commerciale" sera coche avec les bonnes valeurs (type, pourcentage/montant, montant de remise) pre-remplies.
