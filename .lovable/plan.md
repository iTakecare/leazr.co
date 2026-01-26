
# Plan : Refonte "Corporate" des tags et badges

## Objectif

Transformer les tags de l'application vers un style plus professionnel et corporate tout en conservant la lisibilité et la distinction rapide des différents statuts, types et sources.

## Changements visuels prévus

### 1. Arrondi des coins
- **Avant** : `rounded-full` (totalement arrondi, style "pilule")
- **Après** : `rounded` (4px, style corporate sobre)

### 2. Palette de couleurs sobre

Au lieu des couleurs pastel vives actuelles, utiliser une palette gris/bleu plus professionnelle :

| Catégorie | Ancienne couleur | Nouvelle couleur |
|-----------|------------------|------------------|
| **Par défaut** | `bg-gray-50 text-gray-700` | `bg-slate-100 text-slate-700 border-slate-300` |
| **Info/Envoyé** | `bg-sky-100 text-sky-700` | `bg-blue-50 text-blue-700 border-blue-200` |
| **Succès/Validé** | `bg-green-100 text-green-700` | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| **Attention/Attente** | `bg-amber-100 text-amber-700` | `bg-amber-50 text-amber-800 border-amber-300` |
| **Erreur/Rejet** | `bg-rose-100 text-rose-700` | `bg-red-50 text-red-800 border-red-300` |
| **Interne/Analyse** | `bg-purple-100 text-purple-700` | `bg-slate-200 text-slate-700 border-slate-300` |
| **Leaser** | `bg-indigo-100 text-indigo-700` | `bg-slate-100 text-slate-700 border-slate-300` |

### 3. Système de distinction conservé

Les icônes restent pour permettre l'identification rapide :
- ✓ Statuts : Icônes conservées (CheckCircle, XCircle, Send, etc.)
- ✓ Types : Icônes conservées (Globe, Phone, Building, etc.)
- ✓ Sources : Icônes conservées (Search, Linkedin, Users, etc.)

---

## Fichiers à modifier

### 1. `src/components/ui/badge.tsx`
Modifier le `badgeVariants` pour réduire l'arrondi :

```tsx
// Ligne 8 : Changer rounded-full → rounded
"inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold..."
```

### 2. `src/components/offers/OfferStatusBadge.tsx`
Mettre à jour les couleurs des statuts :

| Statut | Nouvelle couleur |
|--------|------------------|
| DRAFT | `bg-slate-100 text-slate-600 border-slate-300` |
| SENT/OFFER_SEND | `bg-blue-50 text-blue-700 border-blue-200` |
| INTERNAL_REVIEW | `bg-slate-100 text-slate-700 border-slate-300` |
| INTERNAL_APPROVED | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| INTERNAL_DOCS_REQUESTED | `bg-amber-50 text-amber-800 border-amber-300` |
| INTERNAL_REJECTED | `bg-red-50 text-red-800 border-red-300` |
| LEASER_REVIEW/INTRODUCED | `bg-slate-100 text-slate-700 border-slate-300` |
| SCORING_REVIEW | `bg-slate-100 text-slate-700 border-slate-300` |
| LEASER_APPROVED | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| LEASER_REJECTED | `bg-red-50 text-red-800 border-red-300` |
| OFFER_ACCEPTED/ACCEPTED | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| VALIDATED | `bg-blue-50 text-blue-800 border-blue-300` |
| FINANCED | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| REJECTED | `bg-red-50 text-red-800 border-red-300` |

### 3. `src/components/offers/OfferTypeTag.tsx`
Mettre à jour les couleurs des types d'offres :

| Type | Nouvelle couleur |
|------|------------------|
| web_request | `bg-slate-100 text-slate-700 border-slate-300` |
| custom_pack_request | `bg-slate-200 text-slate-700 border-slate-400` |
| ambassador_offer | `bg-amber-50 text-amber-800 border-amber-300` |
| client_request | `bg-blue-50 text-blue-700 border-blue-200` |
| partner_offer | `bg-slate-100 text-slate-700 border-slate-300` |
| internal_offer | `bg-slate-200 text-slate-700 border-slate-400` |
| admin_offer | `bg-slate-200 text-slate-700 border-slate-400` |
| self_leasing | `bg-slate-100 text-slate-700 border-slate-300` |

### 4. `src/utils/offerSourceTranslator.ts`
Mettre à jour les couleurs des sources :

| Source | Nouvelle couleur |
|--------|------------------|
| recommendation | `bg-slate-100 text-slate-700 border-slate-300` |
| google | `bg-slate-100 text-slate-700 border-slate-300` |
| meta | `bg-blue-50 text-blue-700 border-blue-200` |
| linkedin | `bg-blue-50 text-blue-700 border-blue-200` |
| existing_client | `bg-emerald-50 text-emerald-800 border-emerald-300` |
| website | `bg-slate-100 text-slate-700 border-slate-300` |
| event | `bg-slate-200 text-slate-700 border-slate-400` |

### 5. `src/components/contracts/ContractStatusBadge.tsx`
Harmoniser avec le même style :

| Statut | Nouvelle couleur |
|--------|------------------|
| CONTRACT_SENT | `bg-blue-50 text-blue-700` |
| CONTRACT_SIGNED | `bg-slate-100 text-slate-700` |
| EQUIPMENT_ORDERED | `bg-slate-200 text-slate-700` |
| DELIVERED | `bg-amber-50 text-amber-800` |
| ACTIVE | `bg-emerald-50 text-emerald-800` |
| EXTENDED | `bg-amber-50 text-amber-800` |
| COMPLETED | `bg-slate-100 text-slate-600` |
| CANCELLED | `bg-red-50 text-red-800` |

---

## Récapitulatif des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ui/badge.tsx` | `rounded-full` → `rounded` (ligne 8) |
| `src/components/offers/OfferStatusBadge.tsx` | Mise à jour palette couleurs (lignes 25-190) |
| `src/components/offers/OfferTypeTag.tsx` | Mise à jour palette couleurs (lignes 54-90) |
| `src/utils/offerSourceTranslator.ts` | Mise à jour palette couleurs (lignes 25-68) |
| `src/components/contracts/ContractStatusBadge.tsx` | Mise à jour palette couleurs (lignes 12-76) |

---

## Résultat attendu

- Tags avec coins légèrement arrondis (4px) au lieu de "pilules"
- Palette sobre gris/bleu plus professionnelle
- Distinction visuelle conservée grâce aux icônes et aux nuances de couleur
- Lisibilité maintenue avec contraste suffisant
- Cohérence visuelle sur toute l'application
