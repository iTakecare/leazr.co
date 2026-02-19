

# Ajout des champs de remise dans le PDF genere depuis AdminOfferDetail

## Probleme

La page de detail d'offre admin (`AdminOfferDetail.tsx`) a sa propre fonction `handleGeneratePDF` qui construit l'objet `offerData` pour le composant `CommercialOffer`. Cette fonction ne passe PAS les champs de remise commerciale, contrairement a la version dans `useOfferActions.ts` qui les inclut correctement.

Le composant `CommercialOffer` a deja toute la logique d'affichage de la remise (bloc rouge, mensualite barree, etc.) -- il recoit simplement des valeurs a zero/undefined et donc n'affiche rien.

## Correction

### Fichier : `src/pages/AdminOfferDetail.tsx`

Ajouter les 4 champs de remise dans l'objet `offerData` (apres le bloc acompte, ligne 499), identique a ce qui existe dans `useOfferActions.ts` :

```typescript
// Remise commerciale
discountAmount: Number((offer as any).discount_amount) || 0,
discountType: (offer as any).discount_type || undefined,
discountValue: Number((offer as any).discount_value) || undefined,
monthlyPaymentBeforeDiscount: Number((offer as any).monthly_payment_before_discount) || undefined,
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/AdminOfferDetail.tsx` | Ajouter les 4 props de remise dans offerData de handleGeneratePDF |

## Resultat attendu

Le PDF genere depuis la page de detail d'offre affichera :
- Le bloc rouge "Remise commerciale" avec le type et le montant
- La mensualite avant remise barree
- La mensualite finale apres remise en gros
- Le label "Mensualite HTVA (apres remise)"
