

# Synchronisation de la date d'achat vers le dashboard

## Constat

Apres analyse du code, voici l'etat actuel :

### Ce qui fonctionne correctement
- **Prix d'achat** : Quand vous modifiez le `supplier_price` (dans Commandes ou Suivi des achats), le champ `actual_purchase_price` est bien mis a jour via `updateContractEquipmentOrder`. Le dashboard utilise `COALESCE(actual_purchase_price, purchase_price)` donc le bon montant est pris en compte.
- **Date dans Suivi des achats** (carte dans le detail du contrat) : La composante `ContractPurchaseTracking` sauvegarde bien `actual_purchase_date` directement.

### Ce qui ne fonctionne PAS
- **Date dans la page Commandes fournisseurs** : Quand le statut passe a "commande" ou "recu", les champs `order_date` et `reception_date` sont remplis automatiquement, mais `actual_purchase_date` n'est **jamais mis a jour**. Or c'est `actual_purchase_date` que le dashboard utilise pour imputer les achats au bon mois.

Le dashboard SQL utilise :
```text
COALESCE(ce.actual_purchase_date, i.invoice_date) pour determiner le mois d'imputation
```

Si `actual_purchase_date` reste NULL et qu'il n'y a pas de facture associee, l'achat n'apparait dans aucun mois du dashboard.

## Solution

Modifier `updateContractEquipmentOrder` dans `src/services/equipmentOrderService.ts` pour synchroniser automatiquement la date vers `actual_purchase_date` :

1. Quand `order_date` est defini dans la mise a jour, copier cette valeur dans `actual_purchase_date`
2. Quand `reception_date` est defini, mettre a jour `actual_purchase_date` avec cette date (la date de reception est plus precise que la date de commande)

Cela garantit que toute modification de date dans la page Commandes fournisseurs se repercute correctement dans le dashboard.

## Detail technique

### Fichier modifie : `src/services/equipmentOrderService.ts`

Fonction `updateContractEquipmentOrder` (lignes 52-63) :

- Ajouter une logique de sync similaire a celle du prix :
  - Si `reception_date` est fourni, `actual_purchase_date = reception_date`
  - Sinon si `order_date` est fourni, `actual_purchase_date = order_date`
- Cette priorite (reception > commande) assure que le mois d'imputation reflette la date la plus significative pour la comptabilite

### Impact
- Le dashboard mensuel imputera les achats au bon mois/annee
- Les KPIs du dashboard seront corrects
- Aucun changement sur les autres composants (ils utilisent deja les bons champs)

