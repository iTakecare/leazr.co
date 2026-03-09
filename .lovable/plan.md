

# Afficher le statut de l'email de suivi post-livraison

## Problème
Le champ `welcome_followup_sent_at` existe dans la table `contracts` mais n'est affiché nulle part dans l'interface. L'utilisateur n'a aucun moyen de savoir si l'email de bienvenue/avis a été envoyé.

## Plan

### 1. Indicateur dans la page détail du contrat
Ajouter un badge/indicateur dans `ContractDetailHeader.tsx` (ou dans la section dates/workflow) montrant :
- **Email envoyé** (vert) avec la date d'envoi si `welcome_followup_sent_at` est renseigné
- **Email planifié** (orange) si le contrat est livré mais pas encore 7 jours, avec la date prévue
- **En attente de livraison** (gris) si le contrat n'est pas encore livré

### 2. Colonne dans le tableau des contrats
Ajouter une colonne ou un indicateur visuel (icône enveloppe) dans la liste des contrats pour voir d'un coup d'oeil quels contrats ont reçu l'email.

### Fichiers impactés
| Fichier | Modification |
|---|---|
| `src/components/contracts/ContractDetailHeader.tsx` | Badge statut email de suivi |
| Composant liste des contrats | Icône/colonne email envoyé |

