

# Ajouter un champ "Numéro de demande leaseur" distinct du numéro de dossier interne

## Contexte
Actuellement, `dossier_number` sert de référence unique. L'utilisateur veut pouvoir saisir le numéro de requête du leaseur (bailleur) séparément, tout en gardant son propre numéro de dossier interne.

## Plan

### 1. Migration DB — Ajouter `leaser_request_number` à la table `offers`
Nouvelle colonne `leaser_request_number` (text, nullable) sur la table `offers`.

### 2. Modifier `OfferReferenceEditor` pour gérer les 2 champs
Le dialog existant sera étendu pour afficher **deux champs** :
- **Numéro de dossier** (interne) → `dossier_number`
- **Numéro de demande leaseur** → `leaser_request_number`

Les deux sont modifiables dans le même dialog.

**Fichier** : `src/components/offer/OfferReferenceEditor.tsx`

### 3. Afficher le numéro leaseur dans l'en-tête de la demande
Sous le `dossier_number`, afficher le `leaser_request_number` s'il existe, avec un libellé discret (ex: "Réf. leaseur: XXXX").

**Fichiers** : `src/pages/AdminOfferDetail.tsx`, `src/pages/OfferDetail.tsx`

### 4. Mettre à jour les types
Ajouter `leaser_request_number` dans `src/services/offers/types.ts` (OfferData).

### Fichiers impactés
| Fichier | Modification |
|---|---|
| Migration SQL | Colonne `leaser_request_number` |
| `OfferReferenceEditor.tsx` | 2 champs dans le dialog |
| `AdminOfferDetail.tsx` | Affichage réf. leaseur |
| `OfferDetail.tsx` | Affichage réf. leaseur |
| `offers/types.ts` | Ajouter le champ au type |

