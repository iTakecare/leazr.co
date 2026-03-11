

# Plan : Restaurer les factures d'achat Billit

## Cause du problème

La migration `20260311151906` a exécuté :
```sql
DELETE FROM invoices WHERE external_invoice_id IS NOT NULL AND contract_id IS NULL AND offer_id IS NULL;
```
Cette requête ciblait les factures importées "orphelines" (BOL.COM, Amazon, etc.), mais elle a aussi supprimé les **factures d'achat Billit** (`invoice_type = 'purchase'`) qui, par design, n'ont ni `contract_id` ni `offer_id`.

## Solution

Les données supprimées ne sont pas récupérables depuis la base. Il faut **ré-importer les factures d'achat depuis Billit** via le bouton d'import existant dans les paramètres Billit.

### Étape 1 : Sécuriser pour éviter que ça se reproduise
Aucune modification de code n'est nécessaire car la migration destructrice a déjà été exécutée et ne se relancera pas.

### Étape 2 : Ré-importer
- Aller dans Paramètres > Billit > Import factures d'achat
- Lancer l'import — l'Edge Function `billit-import-purchase-invoices` vérifie les `external_invoice_id` existants et ne créera pas de doublons, donc toutes les factures d'achat seront ré-importées

### Pas de changement de code requis
L'import Billit existant est fonctionnel et recréera les factures avec le bon `invoice_type = 'purchase'`.

