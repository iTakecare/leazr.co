

## Plan : Attribution de packs aux partenaires

### Contexte
Le service `partnerService.ts` expose déjà `fetchPartnerPacks`, `addPartnerPack`, `removePartnerPack` et `updatePartnerPack`. Il manque l'interface utilisateur pour gérer les packs d'un partenaire.

### Approche
Ajouter un bouton **"Gérer les packs"** sur chaque ligne partenaire dans le tableau. Ce bouton ouvre un **dialog dédié** (`PartnerPackManager`) qui affiche :

1. **Les packs déjà attribués** au partenaire (avec possibilité de supprimer)
2. **Un sélecteur** pour ajouter un pack existant (dropdown des packs disponibles via `product_packs`)
3. **Toggle "Personnalisable"** sur chaque pack attribué (pour activer les options de personnalisation)

### Fichiers à créer/modifier

**1. Créer `src/components/partners/PartnerPackManager.tsx`**
- Dialog qui reçoit `partnerId` et `partnerName` en props
- `useQuery` pour charger les packs attribués via `fetchPartnerPacks`
- `useQuery` pour charger tous les packs disponibles via `getPacks()` (du `packService`)
- Dropdown `Select` filtrant les packs non-encore attribués
- Bouton "Ajouter" qui appelle `addPartnerPack`
- Liste des packs attribués avec : nom, prix, toggle personnalisable, bouton supprimer
- Mutations avec invalidation du cache

**2. Modifier `src/components/partners/PartnerManager.tsx`**
- Importer `PartnerPackManager`
- Ajouter un état `managingPacksPartner` (Partner | null)
- Ajouter un bouton `Package` icon sur chaque ligne du tableau
- Rendre `<PartnerPackManager>` conditionnel sur cet état

### Détail technique
- Réutilise `getPacks()` de `packService.ts` pour lister les packs du catalogue
- Réutilise `fetchPartnerPacks`, `addPartnerPack`, `removePartnerPack`, `updatePartnerPack` de `partnerService.ts`
- Query keys : `["partner-packs", partnerId]` et `["packs"]`

