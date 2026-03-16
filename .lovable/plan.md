

## Rendre le MDM visible côté client

### Problème actuel
Le déploiement logiciel est caché derrière des boutons "Installer" sur chaque équipement individuel. Sans contrats actifs = aucune visibilité. Pas d'entrée menu dédiée.

### Plan

#### 1. Ajouter un onglet "Logiciels" dans la page Équipements client
**Fichier : `src/pages/ClientEquipmentPage.tsx`**
- Ajouter un 5ème onglet `<TabsTrigger value="software">` avec icône `Download`
- Ce tab affiche :
  - La liste des logiciels disponibles dans le catalogue (depuis `software_catalog`)
  - L'historique des déploiements de l'utilisateur (depuis `software_deployments`)
  - Un bouton pour lancer le wizard de déploiement sur un équipement sélectionné

#### 2. Ajouter une entrée "Logiciels" dans le sidebar client
**Fichier : `src/components/layout/ClientSidebar.tsx`**
- Ajouter un item menu "Logiciels" (icône `Download`) pointant vers `/client/equipment` avec l'onglet software pré-sélectionné, ou vers une page dédiée

#### 3. Créer un composant `ClientSoftwareTab.tsx`
**Nouveau fichier : `src/components/equipment/ClientSoftwareTab.tsx`**
- Grille de cartes logiciels disponibles (nom, version, plateformes, icône)
- Sélection d'un équipement cible dans un dropdown
- Bouton "Installer" → ouvre le SoftwareDeploymentWizard
- Section historique : tableau des déploiements passés avec statut (pending/installing/success/failed) et dates

#### 4. Aucune migration nécessaire
Les tables `software_catalog` et `software_deployments` existent déjà avec les bonnes colonnes.

### Fichiers impactés
| Fichier | Action |
|---|---|
| `src/components/equipment/ClientSoftwareTab.tsx` | Nouveau — onglet logiciels |
| `src/pages/ClientEquipmentPage.tsx` | Ajout 5ème onglet |
| `src/components/layout/ClientSidebar.tsx` | Ajout entrée menu (optionnel) |

