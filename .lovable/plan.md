

## Diagnostic

Le problème est dans le calcul des mensualités de la Edge Function `create-product-request`. Elle utilise `unit_price` envoyé par iTakecare comme source de vérité pour les mensualités, mais ces prix sont incorrects/incohérents.

**Preuve** (données de la demande ITC-2026-OFF-4447) :

| Produit | monthly_price DB Leazr | unit_price reçu iTakecare | Écart |
|---|---|---|---|
| ProBook 4 G1iR 16 | 42.95€/u | 49.94 (pour 2) = 24.97€/u | -42% |
| iPhone 16 Pro | 42.95€/u | 24.97€/u | -42% |
| AirPods 4 | 6.95€/u | 4.04€/u | -42% |
| MacBook Air 13 M4 | 40.95€/u | 40.95€/u | OK |

Les `unit_price` d'iTakecare ne correspondent ni aux prix Leazr, ni aux prix avec la réduction de 15%. Le résultat : 119,90€/mois stocké au lieu du montant correct.

**Calcul correct attendu** (prix DB Leazr + discount partenaire) :
- ProBook : 42.95 × 0.85 × 2 = **73.02€**
- iPhone : 42.95 × 0.85 = **36.51€**
- AirPods : 6.95 × 0.85 = **5.91€**
- MacBook : 40.95 (pas de discount) = **40.95€**
- **Total mensuel correct : ~156.38€/mois**

## Correction

**Fichier** : `supabase/functions/create-product-request/index.ts`

**Principe** : Ne plus faire confiance à `unit_price` pour les mensualités. Utiliser `monthly_price` de la DB Leazr (table `product_variant_prices`) comme source de vérité, puis appliquer le `pack_discount_percentage` si présent.

### Modifications

1. **Ligne 231** : Ajouter `monthly_price` au SELECT de la requête variant :
   ```typescript
   .select('price, attributes, monthly_price')
   ```

2. **Lignes 246-255** : Ajouter aussi `monthly_price` au fallback produit :
   ```typescript
   .select('price, monthly_price')
   ```

3. **Lignes 257-263** : Remplacer la logique de calcul mensuel. Au lieu de :
   ```typescript
   const totalMonthlyFromItakecare = product.unit_price || 0;
   const monthlyPrice = totalMonthlyFromItakecare / product.quantity;
   ```
   Par :
   ```typescript
   // Mensualité UNITAIRE depuis la DB Leazr (source de vérité)
   let monthlyPriceUnit = variantMonthlyPrice || productMonthlyPrice || 0;
   
   // Appliquer la réduction pack partenaire si applicable
   if (product.pack_discount_percentage && product.pack_discount_percentage > 0) {
     monthlyPriceUnit = monthlyPriceUnit * (1 - product.pack_discount_percentage / 100);
   }
   
   // Fallback sur unit_price si pas de prix mensuel en DB
   if (monthlyPriceUnit === 0) {
     monthlyPriceUnit = (product.unit_price || 0) / product.quantity;
   }
   
   const totalMonthlyForLine = monthlyPriceUnit * product.quantity;
   ```

4. **Stocker les variables** `variantMonthlyPrice` et `productMonthlyPrice` à partir des résultats des requêtes DB (étapes 1 et 2).

5. **Adapter les totaux** : `totalMonthlyPayment += totalMonthlyForLine` au lieu de `totalMonthlyFromItakecare`.

6. **Adapter equipmentCalculations** : stocker `monthlyPrice: monthlyPriceUnit` pour que les prix de vente et marges soient recalculés avec le coefficient correct.

### Sécurité

Ce changement empêche aussi la manipulation de prix depuis le frontend iTakecare : les mensualités sont toujours calculées depuis la DB Leazr.

### Redéploiement

La Edge Function sera redéployée après modification.

