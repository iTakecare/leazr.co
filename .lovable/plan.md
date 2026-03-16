
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

### Intégration technique

1. **Héberger Fleet** (Docker : `fleetdm/fleet`)
2. **Déployer l'agent `fleetd`** sur les machines clientes
3. **Configurer les secrets Supabase** : `MDM_API_URL` + `MDM_API_TOKEN`
4. L'edge function existante route les appels vers Fleet automatiquement

### Composants

| Fichier | Rôle |
|---|---|
| `src/components/settings/SoftwareCatalogManager.tsx` | CRUD catalogue logiciels |
| `src/components/settings/MDMConfigSection.tsx` | Configuration connexion MDM |
| `src/components/equipment/SoftwareDeploymentWizard.tsx` | Wizard déploiement 3 étapes |
| `supabase/functions/mdm-deploy-software/index.ts` | Proxy API MDM + simulation |
