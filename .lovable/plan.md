

## Plan : Dupliquer un partenaire

### Objectif

Ajouter un bouton "Dupliquer" sur chaque ligne partenaire dans `PartnerManager`. La duplication crée un nouveau partenaire avec tout son contenu (packs, options de packs, liens prestataires) en ne changeant que le nom/slug (suffixé " (copie)").

### Changements

**1. `src/services/partnerService.ts`** — Nouvelle fonction `duplicatePartner`

```typescript
export const duplicatePartner = async (
  sourcePartnerId: string, 
  companyId: string
): Promise<Partner>
```

Logique séquentielle :
1. Fetch le partenaire source → créer une copie avec nom + " (copie)", slug + "-copie", logo/description/website identiques
2. Fetch `partner_packs` du source → insérer chaque pack pour le nouveau partenaire (même `pack_id`, `is_customizable`, `position`)
3. Pour chaque pack copié, fetch `partner_pack_options` de l'original → insérer les options avec le nouveau `partner_pack_id` (sanitize `vprice_` au passage)
4. Fetch `partner_provider_links` du source → insérer chaque lien pour le nouveau partenaire (même `provider_id`, `card_title`, `selected_product_ids`, `position`)
5. Retourner le nouveau partenaire

**2. `src/components/partners/PartnerManager.tsx`** — Bouton dupliquer

- Ajouter une icône `Copy` (lucide) dans la colonne Actions de chaque ligne, entre le bouton Prestataires et Modifier
- Au clic, appeler `duplicatePartner` via une mutation
- Toast de succès avec le nom du nouveau partenaire
- Invalidation du cache `["partners"]`

### Résultat

L'admin clique sur l'icône de duplication, un nouveau partenaire apparait immédiatement dans la liste avec " (copie)" dans le nom. Il peut ensuite l'éditer pour changer nom, logo et site web.

