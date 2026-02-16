

# Afficher le statut "Attente paiement" pour les factures non payees (y compris les achats)

## Probleme

La facture achat ITC-2026-0014 (statut "sent", echeance le 11/03/2026) n'affiche pas le badge "Attente paiement" avec le decompte des jours. Actuellement, ce badge ne s'affiche que lorsque la date d'echeance est **depassee** (facture en retard). Les factures non encore echues affichent simplement "Envoyee", sans indication du delai restant.

## Solution

Modifier la fonction `getStatusBadge` dans `src/pages/InvoicingPage.tsx` pour afficher un badge "Attente paiement" avec un decompte pour **toute facture non payee ayant une date d'echeance**, qu'elle soit depassee ou non :

- **Echeance depassee** : Badge rouge "Attente paiement" + "J-X" (jours de retard) -- comportement actuel, inchange
- **Echeance a venir** : Badge orange "Attente paiement" + "J+X" (jours restants) -- nouveau comportement

## Fichier modifie

`src/pages/InvoicingPage.tsx` -- fonction `getStatusBadge` (lignes 186-204)

## Detail technique

Apres la verification "credited" et apres la verification de retard existante, ajouter une condition pour les factures non payees dont la date d'echeance n'est pas encore atteinte :

```
if (invoice.due_date && !invoice.paid_at && invoice.status !== 'paid') {
  const dueDate = new Date(invoice.due_date);
  
  if (dueDate <= today) {
    // Existant : en retard, badge rouge J-X
  } else {
    // Nouveau : pas encore echue, badge orange J+X (jours restants)
  }
}
```

Cela s'applique a tous les types de factures (leasing et achat) de maniere uniforme.
