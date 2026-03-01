

# Recherche multi-criteres pour Contrats et Demandes

## Constat actuel

Les recherches actuelles sont tres limitees :

| Ecran | Champs recherches |
|---|---|
| Contrats (`useContracts.ts`) | client_name, equipment_description, leaser_name |
| Demandes (`useOfferFilters.ts`) | client_name, equipment_description, amount, monthly_payment |
| CRM (`CompanyCRM.tsx`) | client name/company/email (clients), client_name seulement (offres et contrats) |

Il manque : numero de contrat, numero de dossier, numero de serie, nom de l'entreprise cliente, email, telephone, bailleur, etc.

## Solution proposee

Etendre la logique de filtrage dans les hooks existants pour chercher sur tous les champs pertinents. Pas besoin de nouveaux composants UI -- les barres de recherche existantes restent en place, seule la logique de matching change.

## Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/hooks/useContracts.ts` | Etendre le filtre de recherche a 8+ champs |
| `src/hooks/offers/useOfferFilters.ts` | Etendre le filtre de recherche a 8+ champs |
| `src/components/contracts/ContractsSearch.tsx` | Mettre a jour le placeholder pour refléter le multi-critères |
| `src/components/offers/OffersSearch.tsx` | Mettre a jour le placeholder |
| `src/components/crm/CompanyCRM.tsx` | Etendre les filtres dans les onglets offres et contrats |

## Detail technique

### 1. Contrats - `useContracts.ts` (ligne 92-98)

Champs recherches actuellement : `client_name`, `equipment_description`, `leaser_name`

Champs ajoutes :
- `contract_number` (numero de contrat)
- `offer_dossier_number` (numero de dossier)
- `tracking_number` (numero de suivi)
- `client_email`
- `client_phone`
- `clients?.company` (nom de l'entreprise)
- `clients?.vat_number` (numero de TVA)

Logique :
```typescript
const lowerCaseSearch = searchTerm.toLowerCase();
filtered = filtered.filter(contract => 
  contract.client_name?.toLowerCase().includes(lowerCaseSearch) ||
  contract.equipment_description?.toLowerCase().includes(lowerCaseSearch) ||
  contract.leaser_name?.toLowerCase().includes(lowerCaseSearch) ||
  contract.contract_number?.toLowerCase().includes(lowerCaseSearch) ||
  contract.offer_dossier_number?.toLowerCase().includes(lowerCaseSearch) ||
  contract.tracking_number?.toLowerCase().includes(lowerCaseSearch) ||
  contract.client_email?.toLowerCase().includes(lowerCaseSearch) ||
  contract.client_phone?.toLowerCase().includes(lowerCaseSearch) ||
  contract.clients?.company?.toLowerCase().includes(lowerCaseSearch) ||
  contract.clients?.vat_number?.toLowerCase().includes(lowerCaseSearch)
);
```

### 2. Demandes - `useOfferFilters.ts` (ligne 97-105)

Champs recherches actuellement : `client_name`, `equipment_description`, `amount`, `monthly_payment`

Champs ajoutes :
- `client_email`
- `client_company` (entreprise)
- `id` (recherche par fragment d'ID)
- Equipements des packs personnalises (titre des produits dans `offer_custom_packs`)

Logique :
```typescript
result = result.filter(offer => {
  return offer.client_name?.toLowerCase().includes(lowercasedSearch) ||
    offer.equipment_description?.toLowerCase().includes(lowercasedSearch) ||
    offer.client_email?.toLowerCase().includes(lowercasedSearch) ||
    offer.client_company?.toLowerCase().includes(lowercasedSearch) ||
    String(offer.amount).includes(lowercasedSearch) ||
    String(offer.monthly_payment).includes(lowercasedSearch) ||
    offer.id?.toLowerCase().includes(lowercasedSearch);
});
```

Note : il faudra verifier quels champs sont presents dans le type `Offer` (de `useFetchOffers`) -- `client_email` et `client_company` sont probablement deja dans l'interface.

### 3. CRM - `CompanyCRM.tsx`

Dans les filtres des onglets "Offres" et "Contrats", etendre la recherche aux memes champs que ci-dessus (actuellement ca ne cherche que sur `client_name`).

### 4. Placeholders mis a jour

- **Contrats** : `"Rechercher par nom, n° contrat, équipement, n° série..."` (au lieu de "Rechercher un contrat...")
- **Demandes** : `"Rechercher par nom, équipement, entreprise..."` (au lieu de "Rechercher...")

## Ce qui ne change PAS

- L'apparence visuelle des barres de recherche (pas de nouveau composant UI)
- La structure des hooks (toujours du filtrage client-side)
- Les autres ecrans (catalogue, taches, etc.) qui ont deja leur propre logique adaptee

## Points d'attention

- La recherche reste client-side (filtrage sur les donnees deja chargees en memoire), ce qui est performant pour le volume actuel
- Pour les contrats, il faudra verifier que le champ `contract_equipment` avec `serial_number` est charge dans le `getContracts()` pour pouvoir chercher par numero de serie. Si ce n'est pas le cas, il faudra enrichir la requete.

