

# Plan : Restaurer les factures de vente directe avec les bonnes données

## Approche

Plutôt qu'une migration SQL brute (qui avait produit des données incomplètes avec les préfixes "PUR-"), on va utiliser la fonction existante `generateInvoiceFromPurchaseOffer` qui génère des factures complètes avec :
- Les bonnes données client (nom, adresse, TVA...)
- Les bons équipements avec prix unitaires et totaux
- Les bons montants (prix de vente calculés depuis purchase_price × margin)
- Le bon format de `billing_data`

## Actions

### 1. Créer un utilitaire de restauration batch
Nouveau fichier `src/utils/restorePurchaseInvoices.ts` qui :
- Récupère les 17 offres `is_purchase = true` + `workflow_status = 'invoicing'` sans facture liée
- Appelle `generateInvoiceFromPurchaseOffer` pour chacune
- La fonction existante gère déjà la vérification de doublon, le calcul des montants, et l'enrichissement des équipements

### 2. Ajouter un bouton de restauration temporaire dans InvoicingPage
Un bouton "Restaurer les factures manquantes" visible uniquement quand il y a des offres d'achat en `invoicing` sans facture. Une fois toutes les factures restaurées, le bouton disparaît automatiquement.

### 3. Mise à jour des dates
La fonction `generateInvoiceFromPurchaseOffer` utilise `new Date()` comme date de facture. On la modifiera pour utiliser la date de création de l'offre (`offer.created_at`) comme `invoice_date`, ce qui est plus cohérent avec la réalité.

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/utils/restorePurchaseInvoices.ts` | Nouveau — fonction batch de restauration |
| `src/services/invoiceService.ts` | Utiliser `offer.created_at` comme date de facture au lieu de `new Date()` |
| `src/pages/InvoicingPage.tsx` | Bouton temporaire de restauration |

