

## Problème

Quand la remise pack (ex: -15%) est appliquée sur chaque mensualité unitaire (ligne 257), le résultat n'est **jamais arrondi à 2 décimales**. Exemple :

- Produit à 36.51€/mois × 0.85 = 31.0335€ (pas arrondi)
- Multiplié par quantité, sommé sur 5 lignes → les erreurs flottantes s'accumulent
- Résultat : 182.77€ au lieu de 182.80€

iTakecare arrondit chaque ligne à 2 décimales, mais la Edge Function Leazr travaille avec des décimales flottantes brutes.

## Solution

**Fichier** : `supabase/functions/create-product-request/index.ts`

Arrondir à 2 décimales à deux endroits :

1. **Après application de la remise pack** (ligne 258) : arrondir `monthlyPrice` à 2 décimales
2. **Après calcul de la mensualité totale de la ligne** (ligne 266) : arrondir `totalMonthlyForLine` à 2 décimales

Cela garantit que les mêmes arrondis sont appliqués côté Leazr et côté iTakecare, pour un résultat identique au centime.

