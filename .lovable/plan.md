

# Centrer le stepper dans la page de détail de demande client

## Problème
Le stepper "Suivi de votre demande" dans `ClientWorkflowStepper.tsx` est aligné à gauche. Les étapes ne sont pas centrées horizontalement dans le conteneur.

## Solution
Modifier la ligne 229 de `src/components/client/ClientWorkflowStepper.tsx` :
- Ajouter `justify-center` au conteneur flex du stepper desktop pour centrer les étapes horizontalement.

Même ajustement pour la version mobile (ligne ~151) si applicable.

