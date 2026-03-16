

## Plan : Déploiement logiciel à distance (UI + intégration MDM)

### Architecture

```text
┌─────────────────────┐     ┌──────────────┐     ┌───────────────┐
│  Interface Lovable   │────▶│ Edge Function │────▶│  Fleet / MDM  │
│  (Wizard + Catalog)  │     │  (proxy API)  │     │  (Agent sur   │
│                      │◀────│              │◀────│   machines)   │
└─────────────────────┘     └──────────────┘     └───────────────┘
```

Le MDM (Fleet ou autre) doit être installé séparément (self-hosted ou cloud). Lovable sert de **front-end de gestion** connecté à son API.

---

### Phase 1 : Catalogue de logiciels (Admin Settings)

**Migration DB** : Table `software_catalog`
- `id`, `company_id`, `name`, `description`, `version`, `platform` (mac/windows/both), `package_url`, `silent_install_command`, `icon_url`, `category`, `active`, `created_at`

**Nouveau composant `src/components/settings/SoftwareCatalogManager.tsx`**
- CRUD pour gérer les logiciels disponibles au déploiement
- Champs : nom, version, plateforme (Mac/Windows/Les deux), URL du package, commande d'installation silencieuse
- Catégories : Productivité, Sécurité, Communication, Utilitaires, Autre
- Toggle actif/inactif
- Intégré dans les paramètres admin (nouvel onglet "Logiciels")

---

### Phase 2 : Wizard de déploiement (UI Client Equipment)

**Sur la page Équipements client** (`ClientEquipmentPage.tsx`)
- Bouton "Installer un logiciel" sur chaque équipement individuel
- Ouvre une modale `SoftwareDeploymentWizard.tsx`

**Nouveau `src/components/equipment/SoftwareDeploymentWizard.tsx`**
- Étape 1 : Machine cible affichée (nom, type, assigné à)
- Étape 2 : Sélection des logiciels (grille avec checkboxes, filtré par plateforme de la machine)
- Étape 3 : Confirmation + lancement
- Appel edge function pour déclencher le déploiement via API MDM

---

### Phase 3 : Suivi des déploiements

**Migration DB** : Table `software_deployments`
- `id`, `company_id`, `equipment_id`, `software_id`, `status` (pending/installing/success/failed), `initiated_by`, `initiated_at`, `completed_at`, `error_message`

**Historique visible sur chaque équipement**
- Liste des logiciels installés avec statut
- Badge de statut (en cours, réussi, échoué)

---

### Phase 4 : Edge Function proxy MDM

**`supabase/functions/mdm-deploy-software/index.ts`**
- Reçoit : equipment_id, software_ids[]
- Récupère les infos machine et logiciels depuis la DB
- Appelle l'API du MDM configuré (Fleet par défaut) pour déclencher l'installation
- Met à jour le statut dans `software_deployments`
- Le MDM endpoint est configurable via un secret `MDM_API_URL` + `MDM_API_TOKEN`

---

### Phase 5 : Configuration MDM (Admin Settings)

**Nouveau composant `src/components/settings/MDMConfigSection.tsx`**
- Champs : URL de l'API MDM, Token API, Type de MDM (Fleet/Tactical RMM/MeshCentral/Autre)
- Test de connexion (bouton qui appelle l'edge function pour vérifier la connectivité)
- Stocké dans `platform_settings` ou table dédiée

---

### Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Tables `software_catalog`, `software_deployments` |
| `src/components/settings/SoftwareCatalogManager.tsx` | Nouveau - CRUD catalogue logiciels |
| `src/components/equipment/SoftwareDeploymentWizard.tsx` | Nouveau - Wizard déploiement |
| `src/components/settings/MDMConfigSection.tsx` | Nouveau - Config MDM |
| `supabase/functions/mdm-deploy-software/index.ts` | Nouveau - proxy API MDM |
| `src/pages/ClientEquipmentPage.tsx` | Ajouter bouton "Installer logiciel" |
| Page admin Settings | Ajouter onglets Logiciels et MDM |

### Prérequis externe (hors Lovable)
- Installation de Fleet (ou autre MDM) sur un serveur
- Déploiement de l'agent Fleet sur les machines clientes
- Configuration de l'URL et du token API dans l'app

### Limitation importante
L'installation réelle des logiciels dépend du MDM externe. Sans MDM configuré, le wizard fonctionnera en mode "simulation" (enregistrement des demandes sans exécution).

