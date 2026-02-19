

# Systeme de remise sur les offres (globale et par equipement)

## Objectif

Ajouter un champ de remise (en % ou en euros) applicable a la mensualite totale d'une offre ET/OU a chaque ligne d'equipement individuellement, dans tous les calculateurs (admin, broker, ambassadeur). La marge reduite sera visible cote admin, et la remise apparaitra dans le PDF avec la mensualite d'origine barree et la mensualite remisee.

---

## 1. Migration base de donnees

Ajouter des colonnes aux tables `offers` et `offer_equipment` :

**Table `offers`** (remise globale) :
- `discount_type` (text, nullable) : `'percentage'` ou `'amount'`
- `discount_value` (numeric, nullable) : valeur de la remise (ex: 10 pour 10%, ou 50 pour 50 euros)
- `discount_amount` (numeric, nullable) : montant de la remise calcule en euros
- `monthly_payment_before_discount` (numeric, nullable) : mensualite avant remise

**Table `offer_equipment`** (remise par ligne) :
- `discount_type` (text, nullable)
- `discount_value` (numeric, nullable)
- `discount_amount` (numeric, nullable)
- `monthly_payment_before_discount` (numeric, nullable)

---

## 2. Composant de remise reutilisable

Creer `src/components/offer/DiscountInput.tsx` :
- Toggle pour activer/desactiver la remise
- Selecteur % ou euros (boutons segmentes)
- Champ de saisie de la valeur
- Affichage en temps reel : mensualite d'origine, montant de la remise, mensualite apres remise
- **Avertissement visuel** (orange) si la remise depasse la marge generee (sans bloquer)
- Affichage de la marge restante apres remise (visible uniquement pour admin)

---

## 3. Integration dans les calculateurs

### 3.1 Calculateur Admin (`src/pages/CreateOffer.tsx`)
- Ajouter le composant `DiscountInput` sous le `FinancialSummary`
- Deux niveaux :
  - **Remise globale** : sur la mensualite totale, dans le recapitulatif financier
  - **Remise par equipement** : dans chaque ligne du tableau d'equipements (icone "%" cliquable)
- Propager les valeurs de remise dans `offerData` lors de la sauvegarde

### 3.2 Calculateur Broker (`src/components/broker/calculator/BrokerCalculator.tsx`)
- Ajouter le composant `DiscountInput` apres les resultats par duree
- Meme logique globale + par equipement

### 3.3 Calculateur Ambassadeur (`src/pages/AmbassadorCreateOffer.tsx`)
- Ajouter le composant `DiscountInput` dans le formulaire
- Masquer l'impact sur la marge (pas visible pour les ambassadeurs)

---

## 4. Logique de sauvegarde

### Fichiers modifies :
- `src/pages/CreateOffer.tsx` : ajouter les champs remise dans `offerData`
- `src/components/ambassador/AmbassadorOfferSaveLogic.tsx` : idem
- `src/components/broker/calculator/BrokerCalculator.tsx` : idem
- `src/services/offers/index.ts` : accepter les nouveaux champs dans `createOffer`
- `src/services/offers/types.ts` : ajouter les champs remise dans `OfferData`
- `src/services/offers/clientRequests.ts` : ajouter les champs dans `validOfferFields`
- `src/services/offers/offerEquipment.ts` : persister la remise par equipement

---

## 5. Affichage dans les vues de detail

### `src/components/offers/detail/FinancialSummaryCard.tsx`
- Afficher la mensualite d'origine (barree) si remise appliquee
- Ligne dediee "Remise" avec le montant
- Mensualite apres remise mise en avant
- Marge avant/apres remise (admin uniquement)

### `src/hooks/offers/useOfferDetail.ts`
- Recuperer les champs remise depuis la base

---

## 6. Affichage dans le PDF

### 6.1 PDF React (`src/components/pdf/templates/OfferEquipmentPage.tsx`)
- Par equipement : si remise, afficher mensualite d'origine barree + mensualite remisee
- Section totaux :
  - Mensualite d'origine barree
  - Ligne "Remise : -XX euros (YY%)"
  - Mensualite finale mise en avant

### 6.2 PDF Web (`src/components/offers/CommercialOffer.tsx`)
- Meme logique d'affichage que le PDF React

### 6.3 Data PDF (`src/components/pdf/templates/OfferPDFDocument.tsx`)
- Ajouter les props de remise dans `OfferPDFData`

---

## 7. Affichage dans les listes

### `src/hooks/offers/useFetchOffers.ts`
- Enrichir les offres avec les donnees de remise

### `src/pages/Offers.tsx` / Kanban
- Badge "Remise" sur les cartes d'offres ayant une remise

---

## Resume des fichiers concernes

| Fichier | Type de modification |
|---------|---------------------|
| Migration SQL | Ajout colonnes `discount_*` sur `offers` et `offer_equipment` |
| `src/components/offer/DiscountInput.tsx` | **Nouveau** - Composant reutilisable |
| `src/services/offers/types.ts` | Ajout champs remise dans `OfferData` |
| `src/services/offers/index.ts` | Accepter les nouveaux champs |
| `src/services/offers/clientRequests.ts` | Ajout champs valides |
| `src/services/offers/offerEquipment.ts` | Persister remise par ligne |
| `src/pages/CreateOffer.tsx` | Integration remise globale + par equipement |
| `src/components/broker/calculator/BrokerCalculator.tsx` | Integration remise |
| `src/pages/AmbassadorCreateOffer.tsx` | Integration remise |
| `src/components/ambassador/AmbassadorOfferSaveLogic.tsx` | Sauvegarde remise |
| `src/components/offer/FinancialSummary.tsx` | Affichage remise dans recapitulatif |
| `src/components/offer/EquipmentList.tsx` | Remise par ligne |
| `src/components/offers/detail/FinancialSummaryCard.tsx` | Detail offre |
| `src/hooks/offers/useOfferDetail.ts` | Chargement remise |
| `src/hooks/offers/useFetchOffers.ts` | Enrichissement liste |
| `src/components/pdf/templates/OfferEquipmentPage.tsx` | PDF avec remise |
| `src/components/pdf/templates/OfferPDFDocument.tsx` | Props PDF |
| `src/components/offers/CommercialOffer.tsx` | PDF web avec remise |

