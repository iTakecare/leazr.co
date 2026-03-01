

# Bouton de generation de facture mensuelle dans l'historique Mollie

## Contexte

Dans la carte `MollieSepaCard` des contrats self-leasing, l'historique des paiements Mollie affiche le statut de chaque prelevement (Paye, En cours, Echoue). L'objectif est d'ajouter un bouton "Generer facture" a cote de chaque paiement pour creer la facture de location mensuelle correspondante.

## Comportement souhaite

- **Paiement "Paye"** : Bouton actif permettant de generer la facture du mois
- **Paiement "En cours"** : Bouton visible mais grise (desactive)
- **Paiement "Echoue/Expire/Annule"** : Pas de bouton de facture (le bouton "Relancer" reste)
- Si une facture existe deja pour ce contrat et ce mois, le bouton affiche "Facture generee" avec une icone de validation (desactive)

## Modifications techniques

### 1. Fichier : `src/components/contracts/MollieSepaCard.tsx`

**Ajout d'un import** : `FileText` depuis lucide-react pour l'icone du bouton.

**Ajout d'un state** pour suivre les factures deja generees par mois et le paiement en cours de facturation :
```typescript
const [generatingInvoiceForPayment, setGeneratingInvoiceForPayment] = useState<string | null>(null);
const [invoiceGeneratedForPayments, setInvoiceGeneratedForPayments] = useState<Set<string>>(new Set());
```

**Ajout d'une fonction** `handleGenerateMonthlyInvoice(payment)` qui :
1. Determine le mois/annee du paiement
2. Verifie si une facture existe deja pour ce contrat et ce mois dans la table `invoices`
3. Si non, cree une facture de type `leasing` dans la table `invoices` avec les informations du paiement (montant, date, contrat)
4. Met a jour le state local pour marquer cette facture comme generee

**Ajout d'une verification au chargement** : lors du `fetchMollieDetails`, verifier quels paiements ont deja une facture associee (par mois/annee + contract_id dans la table `invoices`).

**Modification du rendu** dans la boucle `recentPayments.map()` (lignes 508-542) : ajouter le bouton de generation de facture a cote du badge de statut :

- Si statut `paid` et pas encore de facture : bouton actif "Facturer" avec icone FileText
- Si statut `paid` et facture deja generee : badge vert "Facture" (desactive)
- Si statut `pending`/`open` : bouton grise "Facturer" (desactive)
- Si statut `failed`/`expired`/`canceled` : pas de bouton facture (le bouton Relancer reste inchange)

### 2. Fichier : `src/services/invoiceService.ts`

**Ajout d'une nouvelle fonction** `generateSelfLeasingMonthlyInvoice(contractId, companyId, paymentDate, amount)` qui :
1. Verifie qu'une facture n'existe pas deja pour ce contrat et ce mois
2. Recupere les donnees du contrat et de l'entreprise
3. Cree une facture de type `leasing` avec :
   - `contract_id` : l'ID du contrat
   - `company_id` : l'ID de l'entreprise
   - `amount` : le montant du paiement Mollie
   - `invoice_date` : la date du paiement
   - `due_date` : la date du paiement (deja paye)
   - `status` : `paid`
   - `payment_status` : `paid`
   - `type` : `leasing`
   - `invoice_number` : numero genere automatiquement
4. Retourne la facture creee

Cela permettra de generer les factures de location self-leasing mois par mois, en lien direct avec les paiements Mollie confirmes.
