

# Plan : Corriger et exécuter la restauration des 17 factures de vente directe

## Problème identifié

La restauration automatique ne fonctionne pas car le code référence une colonne `offer_reference` qui **n'existe pas** dans la table `offers` (le vrai nom est `offer_number`). La requête Supabase échoue silencieusement et aucune facture n'est créée.

**Preuve** : La base contient 17 offres d'achat en statut `invoicing` et 0 facture de type `purchase`. Les 105 factures existantes sont toutes de type `leasing`.

## Corrections à apporter

### 1. Corriger `src/utils/restorePurchaseInvoices.ts`
- Remplacer `offer_reference` par `offer_number` dans le `select`
- Remplacer les références à `offer.offer_reference` par `offer.offer_number` dans les logs

### 2. Corriger `src/services/invoiceService.ts`
- Ligne 186 : remplacer `offer.offer_reference` par `offer.offer_number` dans le `billing_data.offer_data.reference`

### 3. Rendre la restauration plus robuste dans `InvoicingPage.tsx`
- Ajouter un `console.log` pour tracer l'exécution
- S'assurer que `fetchInvoices` est bien appelé après restauration

## Résultat attendu

Quand l'utilisateur navigue vers la page Facturation :
- Les 17 factures seront créées automatiquement en statut **brouillon**, sans numéro de facture
- Chaque facture contiendra : le bon client, les bons équipements avec prix de vente, les totaux calculés, la date de création de l'offre comme date de facture
- Elles apparaîtront dans la liste principale avec le badge "Vente directe" et seront filtrables via le sous-onglet "Ventes directes"

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/utils/restorePurchaseInvoices.ts` | `offer_reference` → `offer_number` |
| `src/services/invoiceService.ts` | `offer.offer_reference` → `offer.offer_number` |

