

## Problème

Quand un client connecté fait une demande depuis son catalogue, le formulaire `InlineRequestSteps` démarre avec des champs vides. Or les données du client (entreprise, TVA, email, adresse, nom du contact) sont déjà disponibles via `clientData` passé à `ClientCatalogAnonymous`.

## Plan

### 1. Passer `clientData` à `InlineRequestSteps`
**Fichier : `src/components/catalog/client/ClientCatalogAnonymous.tsx`**
- Ajouter la prop `clientData` lors du rendu de `InlineRequestSteps` (ligne ~257)

### 2. Accepter et utiliser `clientData` dans `InlineRequestSteps`
**Fichier : `src/components/catalog/public/InlineRequestSteps.tsx`**
- Ajouter une prop optionnelle `clientData?: Client | null`
- Pré-remplir `companyFormData` avec les données du client :
  - `company` ← `clientData.company` ou `clientData.name`
  - `vat_number` ← `clientData.vat_number`
  - `email` ← `clientData.email`
  - `address` ← `clientData.address` ou `clientData.billing_address`
  - `city` ← `clientData.city` ou `clientData.billing_city`
  - `postal_code` ← `clientData.postal_code` ou `clientData.billing_postal_code`
  - `country` ← `clientData.country` ou `clientData.billing_country` ou `'BE'`
- Pré-remplir `contactFormData` avec :
  - `name` ← `clientData.contact_name` ou `clientData.name`
  - `email` ← `clientData.email`
  - `phone` ← `clientData.phone`
  - Adresses de livraison si différentes

### Fichiers impactés
| Fichier | Action |
|---|---|
| `src/components/catalog/public/InlineRequestSteps.tsx` | Ajouter prop `clientData`, pré-remplir les formulaires |
| `src/components/catalog/client/ClientCatalogAnonymous.tsx` | Passer `clientData` à `InlineRequestSteps` |

