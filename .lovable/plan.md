

## Plan : Intégrer les infos partenaire et services externes dans les demandes

### Contexte actuel

- L'Edge Function `create-product-request` reçoit des produits et packs mais **aucune info partenaire** (ni slug, ni nom).
- Les **services de prestataires externes** (téléphonie, etc.) liés aux partenaires ne sont pas transmis ni stockés dans les demandes.
- Le type d'offre est soit `web_request` soit `custom_pack_request`, sans distinction par partenaire.

### Changements prévus

#### 1. Schéma de validation (`validationSchemas.ts`)
Ajouter au schéma `createProductRequestSchema` :
- `partner_slug` (string, optionnel) : identifiant du partenaire
- `partner_name` (string, optionnel) : nom d'affichage du partenaire
- `external_services` (array, optionnel) : liste des services externes sélectionnés, chaque item contenant : `provider_name`, `product_name`, `description`, `price_htva`, `billing_period`, `quantity`

#### 2. Table `offer_external_services` (migration SQL)
Nouvelle table pour stocker les services prestataires liés à une demande :

```text
offer_external_services
├── id (uuid, PK)
├── offer_id (uuid, FK → offers)
├── provider_name (text)
├── product_name (text)
├── description (text, nullable)
├── price_htva (numeric)
├── billing_period (text: monthly/yearly/one_time)
├── quantity (integer, default 1)
├── created_at (timestamptz)
```
RLS : lecture/écriture pour les utilisateurs authentifiés de la même company.

#### 3. Colonnes `partner_slug` et `partner_name` sur la table `offers`
Ajouter deux colonnes texte nullable sur `offers` pour identifier la source partenaire.

#### 4. Edge Function `create-product-request`
- Extraire `partner_slug` et `partner_name` du body.
- Si `partner_slug` est présent, définir le type comme `partner_request` et stocker slug/name dans l'offre.
- Insérer les `external_services` dans la nouvelle table `offer_external_services`.
- Inclure les services externes dans l'email de notification admin.

#### 5. Types d'offres et tags (`offerTypeTranslator.ts` + `OfferTypeTag.tsx`)
- Nouveau type `partner_request` avec label dynamique : "Partenaire - {partner_name}".
- `translateOfferType` : si type === `partner_request`, retourner le nom du partenaire (à récupérer depuis l'offre).
- `OfferTypeTag` : ajouter case `partner_request` avec icône `Handshake` et style dédié (violet/indigo).
- Le composant acceptera un nouveau prop optionnel `partnerName` pour afficher "Partenaire - The Pod".

#### 6. Liste des demandes (là où `OfferTypeTag` est utilisé)
Modifier la requête qui charge les offres pour inclure `partner_name`, et le passer au composant `OfferTypeTag`.

### Résumé des fichiers modifiés
- `supabase/functions/_shared/validationSchemas.ts`
- `supabase/functions/create-product-request/index.ts`
- `supabase/migrations/` (nouvelle migration)
- `src/utils/offerTypeTranslator.ts`
- `src/components/offers/OfferTypeTag.tsx`
- Composant(s) de liste des offres (pour passer `partnerName` au tag)

