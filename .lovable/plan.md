
# Plan : Système de Packs Partenaires avec Prestataires Externes

## Statut

- ✅ Phase 1 — Modèle de données (6 tables SQL + RLS)
- ✅ Phase 2 — Admin : PartnerManager + ExternalProviderManager + onglets CatalogManagement
- ✅ Phase 3 — API : Endpoints partners, providers dans catalog-api + documentation
- ⬜ Phase 4 — (Optionnel) Page publique partenaire côté Leazr si nécessaire

## Endpoints API ajoutés

| Endpoint | Description |
|---|---|
| `GET /v1/{company}/partners` | Liste des partenaires actifs |
| `GET /v1/{company}/partners/{slug}` | Détail d'un partenaire (par ID ou slug) |
| `GET /v1/{company}/partners/{slug}/packs` | Packs liés avec items, options et produits personnalisables |
| `GET /v1/{company}/partners/{slug}/providers` | Cartes prestataires avec produits/services |
| `GET /v1/{company}/providers` | Liste des prestataires externes actifs |
| `GET /v1/{company}/providers/{id}` | Détail d'un prestataire |
| `GET /v1/{company}/providers/{id}/products` | Produits/services d'un prestataire |

## Documentation

- `catalog-skeleton/partners-api.txt` — Documentation complète des endpoints avec exemples JSON
- `catalog-skeleton/types-partners.txt` — Types TypeScript + hooks React Query

## Tables

- `partners`, `partner_packs`, `partner_pack_options`
- `external_providers`, `external_provider_products`, `partner_provider_links`
- `software_catalog`, `software_deployments`, `mdm_configurations`

---

# Plan : Déploiement logiciel à distance (MDM)

## Statut

- ✅ Phase 1 — Table `software_catalog` + CRUD admin (SoftwareCatalogManager)
- ✅ Phase 2 — Wizard déploiement (SoftwareDeploymentWizard) sur page équipements
- ✅ Phase 3 — Table `software_deployments` + suivi statut
- ✅ Phase 4 — Edge Function `mdm-deploy-software` (proxy API MDM + mode simulation)
- ✅ Phase 5 — Configuration MDM admin (MDMConfigSection)

## MDM recommandé : Fleet (FleetDM)

| Critère | Fleet ✅ | Tactical RMM | MeshCentral |
|---|---|---|---|
| Mac + Windows | ✅ Natif | ⚠️ Windows natif, Mac limité | ⚠️ Remote desktop surtout |
| API déploiement logiciel | ✅ `/api/v1/fleet/software` | ✅ Scripts PowerShell | ❌ Pas d'API packages |
| Packages .pkg / .msi | ✅ Natif | ⚠️ Via Chocolatey/scripts | ❌ |
| Install silencieuse | ✅ Intégré | ✅ Via scripts | ❌ |
| Open-source | ✅ MIT | ✅ | ✅ |

### Composants

| Fichier | Rôle |
|---|---|
| `src/components/settings/SoftwareCatalogManager.tsx` | CRUD catalogue logiciels |
| `src/components/settings/MDMConfigSection.tsx` | Configuration connexion MDM |
| `src/components/equipment/SoftwareDeploymentWizard.tsx` | Wizard déploiement 3 étapes |
| `supabase/functions/mdm-deploy-software/index.ts` | Proxy API MDM + simulation |

---

# Plan : API Catalogue — Endpoints MDM complets

## Statut

- ✅ Phase 1 — 4 nouvelles tables SQL (`mdm_profiles`, `mdm_device_profiles`, `mdm_enrollment_tokens`, `mdm_commands`) + RLS + indexes
- ✅ Phase 2 — Endpoints MDM dans `catalog-api` (~20 endpoints, ~15 handlers)
- ✅ Phase 3 — Documentation `catalog-skeleton/mdm-api.txt` v2026.3

## Endpoints MDM ajoutés

### Devices
| Méthode | Endpoint | Permission |
|---|---|---|
| `GET` | `/v1/{company}/devices` | mdm |
| `GET` | `/v1/{company}/devices/{id}` | mdm |
| `PATCH` | `/v1/{company}/devices/{id}` | mdm_write |
| `GET` | `/v1/{company}/devices/{id}/software` | mdm |
| `GET` | `/v1/{company}/devices/{id}/history` | mdm |
| `GET` | `/v1/{company}/devices/{id}/status` | mdm |
| `POST` | `/v1/{company}/devices/{id}/deploy` | mdm_write |
| `POST` | `/v1/{company}/devices/{id}/command` | mdm_write |
| `POST` | `/v1/{company}/devices/{id}/assign-profile` | mdm_write |
| `DELETE` | `/v1/{company}/devices/{id}/profiles/{profileId}` | mdm_write |

### Software & Deployments
| Méthode | Endpoint | Permission |
|---|---|---|
| `GET` | `/v1/{company}/software` | mdm |
| `GET` | `/v1/{company}/software/{id}` | mdm |
| `GET` | `/v1/{company}/deployments` | mdm |
| `GET` | `/v1/{company}/deployments/{id}` | mdm |
| `PATCH` | `/v1/{company}/deployments/{id}` | mdm (webhook callback) |

### Profiles
| Méthode | Endpoint | Permission |
|---|---|---|
| `GET` | `/v1/{company}/mdm-profiles` | mdm |
| `GET` | `/v1/{company}/mdm-profiles/{id}` | mdm |
| `POST` | `/v1/{company}/mdm-profiles` | mdm_write |

### Enrollment
| Méthode | Endpoint | Permission |
|---|---|---|
| `POST` | `/v1/{company}/enrollment/token` | mdm_write |
| `POST` | `/v1/{company}/enrollment/register` | mdm_write |
| `GET` | `/v1/{company}/enrollment/pending` | mdm_write |

### Commands
| Méthode | Endpoint | Permission |
|---|---|---|
| `GET` | `/v1/{company}/commands` | mdm |
| `GET` | `/v1/{company}/commands/{id}` | mdm |
| `PATCH` | `/v1/{company}/commands/{id}` | mdm (webhook callback) |

## Documentation

- `catalog-skeleton/mdm-api.txt` — Documentation complète v2026.3 avec exemples JSON et workflows d'intégration
