
# Ajouter les lignes d'equipement dans la facture self-leasing mensuelle

## Probleme

La fonction `generateSelfLeasingMonthlyInvoice` dans `invoiceService.ts` cree une facture avec un `billing_data` minimal (juste le type, mois, nom client). Il manque les donnees structurees `equipment_data`, `contract_data` et `leaser_data` que la page de detail de facture utilise pour afficher les lignes de commande.

## Solution

Modifier la fonction `generateSelfLeasingMonthlyInvoice` pour :

1. **Recuperer les donnees completes du contrat** (tracking number, client, etc.) au lieu de seulement `client_name` et `client_email`
2. **Recuperer les equipements du contrat** depuis la table `offer_equipment` (via l'offre liee au contrat)
3. **Construire les lignes `equipment_data`** avec pour chaque equipement : titre, prix, quantite, numero de serie, TVA, et un intitule descriptif du type "Contrat de location LOC-XXX / NomEquipement"
4. **Ajouter `contract_data` et `leaser_data`** (iTakecare comme bailleur pour le self-leasing) dans le `billing_data`

## Changement technique

### Fichier : `src/services/invoiceService.ts`

Modifier la fonction `generateSelfLeasingMonthlyInvoice` (lignes 1140-1222) :

**Etape 1** - Elargir la requete contrat pour recuperer plus de champs :
```typescript
const { data: contract } = await supabase
  .from('contracts')
  .select('*, offers(id, equipment_data)')
  .eq('id', contractId)
  .single();
```

**Etape 2** - Recuperer les equipements depuis `offer_equipment` via l'offre du contrat :
```typescript
const { data: equipmentItems } = await supabase
  .from('offer_equipment')
  .select('*')
  .eq('offer_id', contract.offer_id);
```

**Etape 3** - Construire le `billing_data` complet avec `equipment_data` au meme format que les factures classiques :
```typescript
billing_data: {
  type: 'self_leasing_monthly',
  month: monthKey,
  payment_source: 'mollie',
  contract_data: {
    id: contract.id,
    tracking_number: contract.tracking_number,
    client_name: contract.client_name,
    client_email: contract.client_email,
    offer_id: contract.offer_id,
  },
  leaser_data: {
    name: 'iTakecare',
    // Donnees de la company (bailleur = la company elle-meme en self-leasing)
  },
  equipment_data: equipmentItems.map(item => ({
    title: `Contrat de location ${contract.tracking_number || ''} / ${item.title}`,
    quantity: item.quantity || 1,
    selling_price_excl_vat: item.monthly_payment || (amount / (equipmentItems.length || 1)),
    serial_number: item.serial_number,
    vat_rate: 21,
  })),
  invoice_totals: {
    total_excl_vat: amount,
    vat_amount: amount * 0.21,
    total_incl_vat: amount * 1.21,
  },
  created_at: new Date().toISOString()
}
```

Cela permettra a la page de detail de facture d'afficher correctement les lignes d'equipement avec description, quantite, prix unitaire et total, comme dans les factures classiques Billit.
