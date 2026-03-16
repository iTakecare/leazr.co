

# Logiciels : le client choisit ses logiciels

## Contexte
Actuellement, le catalogue de logiciels est géré uniquement par l'admin (dans Paramètres > Logiciels). Le client peut déjà sélectionner et déployer des logiciels sur ses machines via l'onglet "Logiciels" de la page Équipements. Cependant, deux points manquent :

1. **Lors de la demande d'équipement** (panier → demande) : le client ne peut pas indiquer les logiciels souhaités pour ses futurs équipements.
2. **Le catalogue peut être vide** si l'admin n'a rien configuré — il faudrait un mécanisme de "demande libre" de logiciels.

## Plan

### 1. Ajouter une étape de sélection de logiciels dans le formulaire de demande client

**Fichier : `src/components/checkout/ClientRequestSummary.tsx`**

- Ajouter une section "Logiciels souhaités" entre le récapitulatif du panier et le champ de message.
- Charger le `software_catalog` actif pour la company. Afficher les logiciels sous forme de cases à cocher groupées par catégorie (comme dans le `SoftwareDeploymentWizard`).
- Ajouter un champ texte libre "Autres logiciels souhaités" pour que le client puisse demander des logiciels non listés dans le catalogue.
- Stocker la sélection dans le champ `remarks` de la demande (en enrichissant le texte existant) et/ou dans un nouveau champ JSON dédié si la table `offers` le permet.

### 2. Enregistrer les logiciels demandés avec la demande

**Fichier : `src/services/offers/clientRequests.ts`** (ou équivalent)

- Ajouter les `software_ids` sélectionnés et le texte libre de logiciels supplémentaires dans les données envoyées avec la demande.
- Stocker ces informations dans le champ `remarks` de la demande, en les formatant clairement (ex: "Logiciels demandés : Chrome, Slack, Teams | Autres : Antivirus Kaspersky").

### 3. Améliorer l'onglet Logiciels existant pour le post-livraison

**Fichiers : `src/components/equipment/ClientSoftwareTab.tsx`**

Le fonctionnement actuel est déjà correct pour le post-livraison : le client sélectionne un équipement cible et choisit les logiciels à installer. Aucun changement majeur nécessaire ici, juste s'assurer que le flux est clair et fonctionnel.

### Résumé des modifications

| Fichier | Action |
|---|---|
| `src/components/checkout/ClientRequestSummary.tsx` | Ajouter section de sélection de logiciels + champ libre |
| `src/services/offers/clientRequests.ts` | Inclure les logiciels dans les données de la demande |

Pas de migration DB nécessaire — les logiciels demandés seront stockés dans le champ `remarks` existant de la table `offers`.

