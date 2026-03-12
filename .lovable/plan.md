

# Plan : Supprimer les 17 factures d'achat et nettoyer l'UI

## Actions

### 1. Supprimer les 17 factures d'achat
Exécuter un `DELETE FROM invoices WHERE invoice_type = 'purchase'` via l'outil d'insertion de données pour supprimer toutes les factures de type achat.

### 2. Mettre à jour la description dans PurchaseInvoicesTab
Retirer la mention "importées depuis Billit" dans `src/components/invoicing/PurchaseInvoicesTab.tsx` — remplacer par un texte neutre comme "Factures liées à vos ventes directes".

### 3. Remettre les offres concernées en statut correct (optionnel)
Les 17 offres `is_purchase = true` sont toujours en `workflow_status = 'invoicing'`. Si elles doivent rester en `invoicing`, les factures pourront être régénérées manuellement plus tard. Aucun changement de statut n'est prévu sauf demande contraire.

## Fichiers impactés
- `src/components/invoicing/PurchaseInvoicesTab.tsx` — description mise à jour
- Base de données — suppression des 17 enregistrements

