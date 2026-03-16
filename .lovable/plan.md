
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
