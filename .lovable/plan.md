

# Gestion des factures d'achat Billit liées aux commandes fournisseurs

## Contexte actuel

- L'import Billit ne récupère que les factures **Income** (ventes) via `OrderDirection=Income`
- Les commandes fournisseurs (EquipmentOrders) gèrent déjà les prix d'achat (`supplier_price` → `actual_purchase_price`) mais sans lien avec des factures d'achat
- La table `invoices` supporte déjà `invoice_type: 'purchase'` mais aucune facture d'achat n'est importée depuis Billit

## Plan

### 1. Edge Function : importer les factures Expense depuis Billit

Créer `supabase/functions/billit-import-purchase-invoices/index.ts` — similaire à `billit-import-invoices` mais :
- Appeler l'API avec `OrderDirection=Expense&OrderType=Invoice`
- Stocker avec `invoice_type: 'purchase'`
- Au lieu de matcher avec des contrats, matcher avec des **equipment orders** (offer_equipment / contract_equipment) en comparant le nom du fournisseur Billit (`CounterParty.DisplayName`) avec les fournisseurs existants et les montants
- Stocker les suggestions de matching dans `billing_data.match_suggestions`

### 2. UI d'import des factures d'achat

Créer `src/components/settings/BillitPurchaseInvoiceImportCard.tsx` — carte dans les paramètres Billit pour :
- Bouton "Importer les factures d'achat"
- Affichage du nombre de factures non liées
- Bouton "Matcher les factures d'achat" ouvrant un dialog de matching

### 3. Dialog de matching factures d'achat ↔ commandes

Créer `src/components/settings/BillitPurchaseInvoiceMatchingDialog.tsx` :
- Liste les factures d'achat importées sans lien
- Pour chaque facture, proposer de la relier à une commande fournisseur (equipment order)
- Afficher les suggestions automatiques (par montant/fournisseur)
- Quand l'utilisateur valide le matching :
  - Mettre à jour `contract_equipment.actual_purchase_price` avec le montant de la facture ÷ quantité
  - Mettre à jour `contract_equipment.actual_purchase_date` avec la date de la facture
  - Associer la facture à l'equipment via un champ dans `billing_data`

### 4. Nouvel onglet "Factures d'achat" dans la page Facturation

Ajouter un onglet `purchase-invoices` dans `InvoicingPage.tsx` pour lister les factures d'achat importées, avec :
- Filtre par statut (brouillon, envoyée, payée)
- Indication de la commande liée
- Lien vers la commande fournisseur

### 5. Intégration dans la page Commandes fournisseurs

Dans `EquipmentOrders.tsx`, ajouter une colonne ou un indicateur visuel montrant si une facture d'achat est liée à chaque commande (icône facture avec tooltip du montant facturé vs estimé).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/billit-import-purchase-invoices/index.ts` | Créer — edge function import factures Expense |
| `src/components/settings/BillitPurchaseInvoiceImportCard.tsx` | Créer — carte d'import |
| `src/components/settings/BillitPurchaseInvoiceMatchingDialog.tsx` | Créer — dialog matching factures ↔ commandes |
| `src/pages/InvoicingPage.tsx` | Modifier — ajouter onglet factures d'achat |
| `src/pages/admin/EquipmentOrders.tsx` | Modifier — indicateur facture liée |
| `src/components/settings/BillitIntegrationSettings.tsx` | Modifier — inclure la carte d'import achats |
| `supabase/config.toml` | Modifier — ajouter config de la nouvelle edge function |

## Flux utilisateur

```text
Paramètres Billit → "Importer factures d'achat" 
  → Edge function récupère Expense invoices
  → Stockées en DB avec suggestions de matching
  → "Matcher" → Dialog : facture ↔ commande fournisseur
  → Validation → actual_purchase_price mis à jour sur l'equipment
  → Dashboard reflète les vrais prix d'achat
```

