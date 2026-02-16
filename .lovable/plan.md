
# Permettre la generation de facture des le statut "Commande"

## Contexte
Actuellement, le bouton "Generer la facture" n'est actif que lorsque le contrat atteint le statut **actif**. Vous souhaitez pouvoir generer la facture des que le statut **commande** (`equipment_ordered`) est atteint.

## Modification

Un seul fichier concerne : `src/components/contracts/ContractDetailHeader.tsx`

La condition a la ligne 90-93 sera modifiee pour accepter les deux statuts :

| Avant | Apres |
|-------|-------|
| `contract.status === 'active'` | `['equipment_ordered', 'active'].includes(contract.status)` |

Les autres conditions restent identiques :
- Integration Billit activee
- Pas de facture existante
- Tous les numeros de serie renseignes

Aucun autre fichier n'est modifie.
