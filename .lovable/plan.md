
# Plan : Mandat SEPA avec saisie directe de l'IBAN

## Objectif
Permettre la création d'un mandat SEPA en saisissant directement l'IBAN du client, au lieu de rediriger vers un checkout Mollie (carte de crédit, iDEAL, etc.).

## Solution technique
Mollie permet de créer un mandat SEPA **directement via l'API Mandates** avec les paramètres :
- `method: "directdebit"`
- `consumerName` : nom du titulaire du compte
- `consumerAccount` : l'IBAN
- `consumerBic` : le BIC (optionnel)

Cela crée instantanément un mandat valide sans redirection vers un checkout.

## Modifications à effectuer

### 1. Edge Function `mollie-sepa/index.ts`
Ajouter une nouvelle action `create_direct_mandate` qui appelle directement l'API Mandates Mollie :

```
POST /v2/customers/{customerId}/mandates
{
  "method": "directdebit",
  "consumerName": "Jean Dupont",
  "consumerAccount": "BE68539007547034",
  "consumerBic": "GEBABEBB" (optionnel)
}
```

Cette action retournera directement le mandat créé avec son statut (`valid` ou `pending`).

### 2. Utilitaire frontend `src/utils/mollie.ts`
Ajouter une nouvelle fonction `createDirectMollieMandate()` qui :
- Prend l'IBAN et le nom du consommateur
- Appelle la nouvelle action `create_direct_mandate`
- Retourne le mandat créé

Modifier `setupMollieSepa()` pour supporter les deux flux :
- **Flux IBAN direct** : si l'IBAN est fourni, créer le mandat directement
- **Flux checkout** : sinon, générer un lien de checkout (comportement actuel)

### 3. Composant `MollieSepaCard.tsx`
Modifier le formulaire pour :
- Ajouter un champ IBAN utilisant le composant `IBANInput` existant (avec validation MOD 97-10)
- Ajouter un champ BIC optionnel
- Changer le comportement du submit :
  - Créer le client Mollie
  - Créer le mandat directement avec l'IBAN
  - Afficher le succès immédiat (pas de lien de redirection)

### 4. Interface utilisateur après création
Après la création réussie du mandat avec IBAN :
- Afficher un message de succès avec le statut du mandat
- Permettre de créer l'abonnement de prélèvement automatique
- Supprimer l'étape de "lien à envoyer au client"

## Flux utilisateur final

```text
1. Admin ouvre la fiche contrat
2. Clique sur "Configurer le prélèvement SEPA"
3. Remplit le formulaire :
   - Nom, Prénom, Email (pré-remplis)
   - IBAN du client (avec validation temps réel)
   - BIC (optionnel)
   - Montant mensuel, durée
4. Clique sur "Créer le mandat SEPA"
5. Le mandat est créé instantanément
6. Le contrat est mis à jour avec les IDs Mollie
7. L'admin peut lancer les prélèvements récurrents
```

## Avantages de cette approche
- Pas de redirection externe pour le client
- Création instantanée du mandat
- L'admin contrôle entièrement le processus
- Validation de l'IBAN côté frontend avec le composant existant
- Le composant `IBANInput` avec validation MOD 97-10 est déjà prêt

## Fichiers à modifier
| Fichier | Modification |
|---------|-------------|
| `supabase/functions/mollie-sepa/index.ts` | Ajouter action `create_direct_mandate` |
| `src/utils/mollie.ts` | Ajouter `createDirectMollieMandate()` et modifier `setupMollieSepa()` |
| `src/components/contracts/MollieSepaCard.tsx` | Ajouter champs IBAN/BIC, modifier le flux de soumission |
