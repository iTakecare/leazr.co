

## Probleme

La Edge Function `create-product-request` **ignore** le `unit_price` envoyé par iTakecare et **recalcule** la mensualité depuis les prix en base de données + remise pack. Or les arrondis intermédiaires diffèrent entre les deux systèmes, ce qui crée un écart de quelques centimes (182.80€ vs 182.78€).

Preuve dans les logs : iTakecare envoie `unit_price: 36.52` (déjà la mensualité finale arrondie), mais la Edge Function recalcule depuis la DB (`monthly_price` brut × 0.85 → arrondi différent).

## Solution

**Utiliser `product.unit_price` comme source primaire** pour la mensualité unitaire, puisque c'est le prix que le client a vu et validé sur iTakecare. Fallback sur le calcul DB uniquement si `unit_price` n'est pas fourni.

Pour la sécurité, ajouter une validation : si le `unit_price` envoyé s'écarte de plus de 5% du prix DB calculé, logger un avertissement mais utiliser quand même le prix iTakecare (les deux systèmes partagent la même base de données).

### Modification

**Fichier** : `supabase/functions/create-product-request/index.ts` (lignes 252-266)

Remplacer la logique actuelle :
```typescript
// AVANT : on ignore unit_price et on recalcule
let monthlyPrice = variantMonthlyPrice || productMonthlyPrice || 0;
if (discount) monthlyPrice = Math.round(monthlyPrice * (1 - discount/100) * 100) / 100;
if (monthlyPrice === 0) monthlyPrice = product.unit_price / product.quantity; // fallback
```

Par :
```typescript
// APRÈS : on utilise unit_price d'iTakecare en priorité (prix vu par le client)
let monthlyPrice = 0;

if (product.unit_price && product.unit_price > 0) {
  // Prix envoyé par iTakecare = ce que le client a vu (déjà arrondi, déjà remisé)
  monthlyPrice = product.unit_price;
  
  // Validation de cohérence avec la DB (log seulement)
  let dbMonthly = variantMonthlyPrice || productMonthlyPrice || 0;
  if (dbMonthly > 0 && product.pack_discount_percentage > 0) {
    dbMonthly = Math.round(dbMonthly * (1 - product.pack_discount_percentage / 100) * 100) / 100;
  }
  if (dbMonthly > 0 && Math.abs(monthlyPrice - dbMonthly) / dbMonthly > 0.05) {
    console.warn(`⚠️ Écart >5% entre iTakecare (${monthlyPrice}€) et DB (${dbMonthly}€)`);
  }
} else {
  // Fallback : calcul depuis la DB (cas sans iTakecare)
  monthlyPrice = variantMonthlyPrice || productMonthlyPrice || 0;
  if (monthlyPrice > 0 && product.pack_discount_percentage > 0) {
    monthlyPrice = Math.round(monthlyPrice * (1 - product.pack_discount_percentage / 100) * 100) / 100;
  }
}
```

Et supprimer le bloc fallback `unit_price` qui suit (lignes 261-264) puisque `unit_price` est maintenant traité en premier.

Le reste (calcul coefficient, insertion offre/équipements) reste inchangé. Le total sera désormais exactement identique à ce qu'affiche iTakecare.

