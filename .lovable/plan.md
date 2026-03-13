
# Plan : Système de Packs Partenaires avec Prestataires Externes

## Statut

- ✅ Phase 1 — Modèle de données (6 tables SQL + RLS)
- ✅ Phase 2 — Admin : PartnerManager + ExternalProviderManager + onglets CatalogManagement
- ⬜ Phase 3 — Page publique partenaire (PartnerLandingPage + routing /:partnerSlug)
- ⬜ Phase 4 — Documentation API

## Tables créées

- `partners` — Entités partenaires avec slug unique
- `partner_packs` — Liaison partenaire ↔ pack
- `partner_pack_options` — Options personnalisables par catégorie
- `external_providers` — Prestataires externes (Proximus, etc.)
- `external_provider_products` — Produits/services des prestataires
- `partner_provider_links` — Liaison partenaire ↔ prestataire avec carte config

## Fichiers créés

- `src/types/partner.ts` — Types TypeScript
- `src/services/partnerService.ts` — CRUD partenaires + packs + liens
- `src/services/externalProviderService.ts` — CRUD prestataires + produits
- `src/components/partners/PartnerManager.tsx` — Admin partenaires
- `src/components/partners/ExternalProviderManager.tsx` — Admin prestataires

## Prochaines étapes

- Phase 3 : Route `/:partnerSlug`, composant `PartnerLandingPage.tsx`
- Phase 4 : Documentation API dans `catalog-skeleton/`
