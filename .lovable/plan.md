

# Plan : Restaurer les factures et réorganiser les filtres

## 1. Restaurer les 17 factures manquantes via migration
Exécuter directement `restorePurchaseInvoices()` via une migration SQL ou un appel automatique au montage de la page (sans bouton), pour que les factures soient créées immédiatement avec toutes les données complètes (équipement, dates, montants, client).

En pratique : déclencher automatiquement la restauration au montage si `orphanedCount > 0`, sans attendre un clic utilisateur. Le bandeau orange deviendra un indicateur de progression puis disparaîtra.

## 2. Supprimer l'onglet séparé "Ventes directes"
Retirer le `TabsTrigger` et `TabsContent` pour `purchase-invoices` dans `InvoicingPage.tsx`. Les factures de vente directe sont déjà affichées dans l'onglet principal "Factures vente" avec le badge "Vente directe".

## 3. Ajouter un filtre "Ventes directes" dans la barre de sous-onglets
Ajouter un sous-onglet **"Ventes directes"** dans la ligne de filtres de statut (à côté de Toutes, Brouillons, Envoyées, Payées, Créditées). Ce filtre affichera uniquement les factures avec `invoice_type === 'purchase'`.

Modifications dans `filteredInvoices` :
- Nouveau cas `invoiceStatusFilter === "direct-sales"` → filtrer sur `invoice_type === 'purchase'`
- Ajouter le compteur correspondant dans `invoiceCounts`

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/pages/InvoicingPage.tsx` | Suppression onglet "Ventes directes", ajout sous-filtre "Ventes directes", auto-restauration au montage |

