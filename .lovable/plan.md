

# Plan : Correction stepper "Contrat prêt" + Vérification carte d'identité + Bouton demande de docs

## Problèmes identifiés

### 1. Le step "Contrat prêt" ne s'affiche pas comme actif
Quand on passe de "Résultat leaser" à "Contrat prêt", le status DB devient `offer_validation`. Le mapping dans `getCurrentStepIndex` mappe `offer_validation` → `validated`, et le step_key DB est bien `validated`. **Cependant**, le stepper WinBroker ne trouve pas toujours le bon index car le mapping vers `Scoring_review` (avec un S majuscule) crée des conflits. De plus, après la validation avec email, `onStatusChange` est appelé avec `offer_validation` mais le composant parent peut ne pas rafraîchir correctement le status depuis la DB.

**Correction** : S'assurer que le `statusMapping` dans `WinBrokerWorkflowStepper` couvre tous les cas et que `offer_validation` map bien vers `validated`. Ajouter aussi `contract_ready` et `contrat_pret` comme aliases au cas où.

### 2. Vérification carte d'identité avant envoi des félicitations
Avant d'ouvrir la modale `EmailConfirmationModal` (transition vers `validated`/`offer_validation`), vérifier dans `offer_documents` si des documents de type `id_card_front` ou `id_card_back` existent pour cette offre. Si absents, afficher un warning non bloquant demandant confirmation.

### 3. Bouton demande de documents dans le scoring B
Quand le score est B (interne ou leaser), un bouton dans le stepper doit permettre d'ouvrir directement le `RequestInfoModal` ou `ScoringModal` en mode demande de docs. Ce bouton existe déjà via le scoring B flow dans `ScoringModal.tsx` — il suffit de le rendre plus visible/accessible depuis le stepper.

## Modifications

### `src/components/offers/detail/WinBrokerWorkflowStepper.tsx`

1. **Correction du mapping** : Ajouter dans `statusMapping` les entrées manquantes pour garantir que `offer_validation` et `validated` sont toujours résolus vers le bon step. Nettoyer les doublons et cas ambigus.

2. **Vérification carte d'identité** : Avant d'ouvrir `showEmailModal` (ligne 200-203), faire une requête async vers `offer_documents` pour vérifier la présence de `id_card_front` / `id_card_back`. Si absents, afficher un `window.confirm` avec un warning du type "Aucune carte d'identité n'a été trouvée dans les documents. Voulez-vous continuer ?". Si l'utilisateur clique "Non", on ne procède pas. Si "Oui", on ouvre la modale email normalement.

3. **Bouton demande de docs pour score B** : Dans le rendu du stepper, quand un step a `enables_scoring` et que le score actuel est `B` (docs en attente), ajouter un bouton supplémentaire visible "Demander des documents" qui ouvre le `ScoringModal` ou le `RequestInfoModal` directement. Ce bouton sera visible dans la carte du step actif quand `waitingDocs` est true ou quand le score est B.

### `src/components/offers/detail/InteractiveWorkflowStepper.tsx`

Mêmes corrections de mapping et vérification carte d'identité (ce stepper partage la même logique).

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `WinBrokerWorkflowStepper.tsx` | Fix mapping, ajout vérification ID card, bouton docs score B |
| `InteractiveWorkflowStepper.tsx` | Mêmes corrections (mapping + ID card check) |

Aucune migration DB nécessaire — les documents `id_card_front`/`id_card_back` utilisent le champ `document_type` existant dans `offer_documents`.

