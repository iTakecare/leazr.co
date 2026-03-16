

## Corrections du Dashboard Client

Deux corrections simples :

### 1. Texte de la bannière
Ligne 159-161 : Remplacer "Voici un aperçu de votre espace de financement" par **"Bienvenue dans l'espace de gestion de vos contrats"**.

### 2. Activité récente - état vide
Lignes 352-355 : Améliorer le message vide pour qu'il soit plus accueillant et pertinent quand il n'y a ni contrats ni équipements. Remplacer par un message du type "Vous n'avez pas encore d'activité. Vos contrats et demandes apparaîtront ici." avec un bouton CTA pour faire une nouvelle demande ou consulter le catalogue.

### Fichier modifié
| Fichier | Modification |
|---------|-------------|
| `src/pages/ClientDashboard.tsx` | Texte bannière + état vide activité récente |

