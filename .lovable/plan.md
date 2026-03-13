

## Plan : Attacher des prestataires externes aux partenaires

### Contexte
Le service `partnerService.ts` expose déjà `fetchPartnerProviderLinks`, `addPartnerProviderLink`, `updatePartnerProviderLink` et `removePartnerProviderLink`. Il manque l'interface utilisateur.

### Approche
Même pattern que pour les packs : un bouton sur chaque ligne partenaire ouvrant un dialog dédié.

### Fichiers à créer/modifier

**1. Créer `src/components/partners/PartnerProviderManager.tsx`**
- Dialog recevant `partner: Partner` en props
- `useQuery` pour charger les liens existants via `fetchPartnerProviderLinks`
- `useQuery` pour charger tous les prestataires via `fetchExternalProviders`
- Formulaire d'ajout : sélection du prestataire + titre de la carte
- Liste des prestataires liés avec : nom du prestataire, titre de carte (éditable), bouton supprimer
- Mutations avec invalidation du cache `["partner-provider-links", partnerId]`

**2. Modifier `src/components/partners/PartnerManager.tsx`**
- Importer `PartnerProviderManager` + icône `Link`
- Ajouter état `managingProvidersPartner` (Partner | null)
- Ajouter bouton `Link` icon sur chaque ligne du tableau (à côté du bouton Package existant)
- Rendre `<PartnerProviderManager>` conditionnel

### Services réutilisés
- `partnerService.ts` : `fetchPartnerProviderLinks`, `addPartnerProviderLink`, `removePartnerProviderLink`, `updatePartnerProviderLink`
- `externalProviderService.ts` : `fetchExternalProviders`

