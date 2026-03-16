

# Plan : Enrichir l'API Catalogue avec des endpoints MDM complets

## Contexte

Vous avez développé votre propre MDM et souhaitez l'intégrer via l'API catalogue (`catalog-api`). Actuellement, l'API ne propose aucun endpoint MDM — seule l'edge function `mdm-deploy-software` existe en interne. Il faut exposer des endpoints RESTful dans `catalog-api` pour couvrir l'ensemble des fonctionnalités MDM.

## Nouveaux endpoints à ajouter

### 1. Appareils (Devices)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/{company}/devices` | Liste des équipements avec filtres (type, statut, collaborateur) |
| `GET` | `/v1/{company}/devices/{id}` | Détail d'un appareil (serial, collaborateur, contrat, tracking) |
| `PATCH` | `/v1/{company}/devices/{id}` | Mise à jour (serial, statut, notes) |
| `GET` | `/v1/{company}/devices/{id}/software` | Logiciels installés/déployés sur cet appareil |
| `GET` | `/v1/{company}/devices/{id}/history` | Historique des mouvements (via `equipment_tracking`) |

### 2. Déploiement logiciel (Software)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/{company}/software` | Catalogue logiciels actifs |
| `GET` | `/v1/{company}/software/{id}` | Détail d'un logiciel (commande silencieuse, plateforme, etc.) |
| `POST` | `/v1/{company}/devices/{id}/deploy` | Déployer un ou plusieurs logiciels sur un appareil |
| `GET` | `/v1/{company}/deployments` | Liste des déploiements (filtrable par statut, appareil) |
| `GET` | `/v1/{company}/deployments/{id}` | Statut détaillé d'un déploiement |
| `PATCH` | `/v1/{company}/deployments/{id}` | Callback : votre MDM met à jour le statut (installing → success/failed) |

### 3. Profils et Politiques (nouvelles tables nécessaires)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/{company}/profiles` | Liste des profils de configuration |
| `POST` | `/v1/{company}/profiles` | Créer un profil (Wi-Fi, VPN, restrictions, etc.) |
| `POST` | `/v1/{company}/devices/{id}/assign-profile` | Assigner un profil à un appareil |
| `DELETE` | `/v1/{company}/devices/{id}/profiles/{profileId}` | Retirer un profil |

### 4. Enrôlement (Enrollment)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/{company}/enrollment/token` | Générer un token/QR d'enrôlement pour un appareil |
| `POST` | `/v1/{company}/enrollment/register` | Callback : enregistrer un appareil nouvellement enrôlé |
| `GET` | `/v1/{company}/enrollment/pending` | Appareils en attente d'enrôlement |

### 5. RMM / Support

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/{company}/devices/{id}/command` | Envoyer une commande (lock, wipe, restart, script) |
| `GET` | `/v1/{company}/devices/{id}/status` | État temps réel (online/offline, batterie, OS, stockage) |

## Modifications techniques

### Nouvelles tables SQL (migration)

**`mdm_profiles`** — Profils de configuration
- `id`, `company_id`, `name`, `description`, `profile_type` (wifi, vpn, restriction, email, custom), `payload` (JSONB), `platform`, `is_active`, timestamps

**`mdm_device_profiles`** — Association appareil ↔ profil
- `id`, `company_id`, `equipment_id`, `profile_id`, `status` (pending, applied, failed), `applied_at`, timestamps

**`mdm_enrollment_tokens`** — Tokens d'enrôlement
- `id`, `company_id`, `equipment_id`, `token`, `expires_at`, `is_used`, timestamps

**`mdm_commands`** — Commandes envoyées aux appareils
- `id`, `company_id`, `equipment_id`, `command_type` (lock, wipe, restart, script), `payload` (JSONB), `status`, `result` (JSONB), `initiated_by`, timestamps

### Fichier modifié : `supabase/functions/catalog-api/index.ts`

- Ajouter les cas `devices`, `software`, `deployments`, `profiles`, `enrollment`, `commands` dans le `switch(endpoint)`
- Nouvelle permission API : `mdm` (à vérifier dans `keyData.permissions`)
- Chaque handler query les tables existantes (`contract_equipment`, `software_catalog`, `software_deployments`) + les nouvelles tables
- Le endpoint `PATCH /deployments/{id}` sert de **webhook callback** pour que votre MDM puisse notifier les changements de statut

### Permissions API Key

Ajouter dans le système de permissions existant :
- `mdm` : lecture des appareils, logiciels, déploiements
- `mdm_write` : déploiement, commandes, gestion profils, enrôlement

## Résumé des changements

| Élément | Action |
|---|---|
| Migration SQL | 4 nouvelles tables (`mdm_profiles`, `mdm_device_profiles`, `mdm_enrollment_tokens`, `mdm_commands`) + RLS |
| `catalog-api/index.ts` | ~6 nouveaux blocs dans le switch + ~15 fonctions handler |
| Documentation | Fichier `catalog-skeleton/mdm-api.txt` avec tous les endpoints et exemples JSON |

