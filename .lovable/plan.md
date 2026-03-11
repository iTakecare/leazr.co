

# Synchronisation complète Billit : factures de vente, notes de crédit et projets

## Problème actuel

1. **Factures de vente** : l'import Billit ne cherche qu'à matcher avec des **contrats sans facture** (`invoice_generated = false`). Les factures de vente existantes dans Leazr (y compris projets au format `INV-xxxxxx`) ne sont pas détectées comme doublons potentiels — Billit les réimporte comme nouvelles.
2. **Notes de crédit** : aucun import depuis Billit. L'API expose les credit notes via `OrderType=CreditNote` (direction `Income` pour ventes, `Expense` pour achats).
3. **Factures projet** : les factures générées depuis des offres/projets (avec `offer_id`, sans `contract_id`) ne sont pas prises en compte dans le matching.

## Plan

### 1. Modifier l'Edge Function `billit-import-invoices` — matching intelligent avec factures existantes

Au lieu de ne chercher que les contrats sans facture, ajouter une étape de **réconciliation avec les factures existantes** dans Leazr :

- Récupérer toutes les factures Leazr existantes (pas seulement celles sans `external_invoice_id`)
- Pour chaque facture Billit entrante :
  1. Si `external_invoice_id` existe → skip (déjà importée, comme avant)
  2. Sinon, chercher une facture Leazr existante matchant par **montant** (tolérance ±2%) et **nom client** similaire
  3. Si match trouvé → lier la facture existante à Billit (`external_invoice_id`, `pdf_url`, statut Billit) au lieu de créer un doublon
  4. Si pas de match → créer nouvelle facture (comportement actuel)

### 2. Créer une nouvelle Edge Function `billit-import-credit-notes`

- Appeler l'API Billit avec `OrderType=CreditNote&OrderDirection=Income` pour les NC de vente
- Optionnellement `OrderDirection=Expense` pour les NC d'achat
- Stocker dans la table `credit_notes` existante en matchant avec la facture liée via `AboutInvoiceNumber` (champ Billit qui référence la facture originale) ou par montant
- Mettre à jour le statut de la facture liée (`credited` / `partial_credit`)

### 3. UI — Bouton d'import NC dans la page facturation ou settings Billit

- Ajouter un `BillitCreditNoteImportCard` dans les settings Billit
- Afficher le résultat : NC importées, NC matchées avec factures existantes

### 4. Améliorer le matching dialog pour les factures projet

- Dans `BillitInvoiceMatchingDialog`, au lieu de ne proposer que des contrats, proposer aussi les **factures existantes orphelines** (celles avec `offer_id` mais sans `external_invoice_id`) pour la réconciliation

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/billit-import-invoices/index.ts` | Modifier — ajouter réconciliation avec factures existantes par montant |
| `supabase/functions/billit-import-credit-notes/index.ts` | Créer — import NC depuis Billit |
| `src/components/settings/BillitCreditNoteImportCard.tsx` | Créer — carte UI import NC |
| `src/components/settings/BillitIntegrationSettings.tsx` | Modifier — ajouter carte NC |
| `src/components/settings/BillitInvoiceMatchingDialog.tsx` | Modifier — inclure factures projet dans le matching |
| `supabase/config.toml` | Modifier — ajouter `billit-import-credit-notes` |

## Flux

```text
Import factures vente (existant amélioré):
  Billit Income Invoices
    → Déjà importée (external_id) ? Skip
    → Match avec facture Leazr existante (montant ±2%) ? → Lier (update external_id, statut)
    → Sinon → Créer nouvelle + suggestions de matching contrats

Import notes de crédit (nouveau):
  Billit CreditNotes (Income)
    → Match facture via AboutInvoiceNumber ou montant
    → Créer credit_note + mettre à jour statut facture
```

## Détails techniques

**Matching factures existantes par montant** dans `billit-import-invoices` :
```typescript
// Récupérer TOUTES les factures Leazr sans external_invoice_id
const { data: leazrInvoices } = await supabase
  .from('invoices')
  .select('id, invoice_number, amount, leaser_name')
  .eq('company_id', companyId)
  .is('external_invoice_id', null);

// Pour chaque facture Billit, chercher un match existant
const existingMatch = leazrInvoices.find(inv => {
  const amountDiff = Math.abs(inv.amount - billitInvoice.TotalExcl) / billitInvoice.TotalExcl;
  return amountDiff <= 0.02; // ±2%
});

if (existingMatch) {
  // UPDATE au lieu de INSERT
  await supabase.from('invoices').update({
    external_invoice_id: externalId,
    pdf_url: pdfUrl,
    status: billitStatus,
    // ...
  }).eq('id', existingMatch.id);
}
```

**Import credit notes** — structure Billit :
- `OrderType: "CreditNote"`, `OrderDirection: "Income"`
- `AboutInvoiceNumber` : référence vers la facture originale
- Montants positifs dans le JSON

