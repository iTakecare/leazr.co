
# Fix: Bouton "Générer la facture" grisé malgré le statut "Commandé"

## Diagnostic

La modification du statut (`equipment_ordered` accepté en plus de `active`) est bien en place dans le code. Le problème vient d'un **problème de timing entre deux useEffect** :

1. Le premier `useEffect` (ligne 44) charge l'état `billitEnabled` de maniere asynchrone
2. Le second `useEffect` (ligne 73) calcule `canGenerateInvoice` en utilisant `billitEnabled`

Le souci : la fonction `getInvoiceByContractId` dans les dependances du second effet n'est **pas memoizee** (pas de `useCallback`). Elle change de reference a chaque render, ce qui destabilise l'execution de l'effet et peut mener a un calcul fait avec `billitEnabled = false` (valeur initiale).

## Solution

Fusionner la verification Billit et le calcul de `canGenerateInvoice` dans un **seul useEffect** pour eliminer la course (race condition).

### Fichier modifie

`src/components/contracts/ContractDetailHeader.tsx`

### Changements

1. **Supprimer le useEffect Billit separe** (lignes 44-53)
2. **Fusionner la logique** dans le useEffect principal (lignes 73-99) : verifier Billit, chercher la facture existante, verifier les numeros de serie, et calculer `canGenerate` -- le tout dans un seul bloc asynchrone
3. **Retirer `getInvoiceByContractId`** de la dependance : utiliser directement `supabase` pour chercher la facture existante (plus stable)
4. **Nettoyer les dependances** du useEffect : `[contract.id, contract.status, companyId]`

### Resultat

Le calcul de `canGenerateInvoice` se fera en une seule passe avec toutes les donnees fraiches, sans risque de race condition entre les effets.
