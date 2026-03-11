

# Plan : Désactiver Billit et restaurer les factures de vente directe

## Diagnostic

### Cause de la disparition
La migration `20260311144401` contenait : `DELETE FROM invoices WHERE invoice_type = 'purchase'` — supprimant **toutes** les factures de vente directe, y compris les 17 factures générées localement depuis les offres d'achat (pas seulement celles de Billit).

### Etat actuel
- **0 factures** avec `invoice_type = 'purchase'` en base
- **17 offres** avec `is_purchase = true` et `workflow_status = 'invoicing'` (dont 2 en 2026) n'ont plus de facture associée
- La carte "Ventes Directes" du dashboard et l'onglet "Factures achat" sont donc vides

## Corrections

### 1. Restaurer les 17 factures de vente directe supprimées

Ajouter un mécanisme de restauration qui appelle `generateInvoiceFromPurchaseOffer` pour chaque offre en statut `invoicing` avec `is_purchase = true` qui n'a pas de facture liée. Cela recréera les factures avec toutes les données nécessaires (client, équipements, totaux).

Concrètement : ajouter un bouton admin temporaire "Restaurer les factures manquantes" dans la page Facturation, ou un hook qui s'exécute automatiquement au chargement pour régénérer les factures manquantes.

### 2. Désactiver Billit partout

| Fichier | Action |
|---|---|
| `src/components/settings/BillitIntegrationSettings.tsx` | Masquer le composant complet (return null ou retrait de l'import dans la page Settings) |
| `src/components/settings/BillitInvoiceImportCard.tsx` | Plus importé/rendu |
| `src/components/settings/BillitPurchaseInvoiceImportCard.tsx` | Plus importé/rendu |
| `src/components/settings/BillitCreditNoteImportCard.tsx` | Plus importé/rendu |
| `src/services/invoiceService.ts` (generateLocalInvoice) | Changer `integration_type: 'billit'` → `'local'` pour les nouvelles factures leasing |
| `src/components/invoicing/PurchaseInvoicesTab.tsx` | Retirer la mention "importées depuis Billit" dans la description |
| Page Settings | Retirer la section Billit |

### 3. Nettoyer les références Billit dans le dashboard

Le dashboard et le listing des factures continueront à fonctionner normalement une fois les factures restaurées, car ils requêtent par `invoice_type` et non par `integration_type`.

### Fichiers impactés

| Fichier | Modification |
|---|---|
| Page Settings (import de BillitIntegrationSettings) | Retirer l'import et le rendu du composant |
| `src/services/invoiceService.ts` | `integration_type: 'local'` au lieu de `'billit'` |
| `src/components/invoicing/PurchaseInvoicesTab.tsx` | Retirer mention Billit |
| `src/pages/InvoicingPage.tsx` | Ajouter bouton de restauration des factures manquantes |
| Nouveau service ou hook | Fonction de restauration batch des factures purchase depuis les offres |

