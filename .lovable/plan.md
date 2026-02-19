

# Affichage de la remise dans le detail et la liste des demandes

## Diagnostic

La remise est bien enregistree en base de donnees (verifie : `discount_type=percentage`, `discount_value=10`, `discount_amount=297.55`, `monthly_payment_before_discount=2975.5`). Le probleme est purement cote affichage : aucun composant ne lit ces champs pour les montrer.

**3 zones a corriger :**

1. **Page de detail - Resume financier** (`FinancialSection.tsx`) : n'utilise pas les champs `discount_*` de l'offre. La mensualite et la marge sont affichees sans tenir compte de la remise.

2. **Liste des demandes** (`OffersTable.tsx`) : la colonne "Mensualite" affiche la mensualite brute, sans indication de remise.

3. **Composant `FinancialSummaryCard.tsx`** : contient deja le code d'affichage de la remise, mais n'est importe nulle part dans l'application.

---

## Corrections prevues

### 1. `src/components/offers/detail/FinancialSection.tsx`

Dans la carte "Mensualite totale" (lignes 304-318), ajouter la logique de remise :

- Lire `offer.discount_type`, `offer.discount_value`, `offer.discount_amount`, `offer.monthly_payment_before_discount`
- Si `discount_amount > 0` :
  - Afficher la mensualite avant remise barree
  - Ligne "Remise" avec le montant et le type (ex: "-297,55 euros (10%)")
  - Mensualite apres remise en gras
- Dans la carte "Marge totale", recalculer la marge apres remise avec la formule Grenke :
  - `Marge apres remise = (mensualite apres remise x 100 / coefficient) - prix d'achat total`
  - Afficher les deux marges (avant/apres) si remise active

### 2. `src/components/offers/OffersTable.tsx`

Dans la cellule "Mensualite" (lignes 626-633) :

- Lire `offer.discount_amount` et `offer.monthly_payment_before_discount`
- Si remise active :
  - Afficher la mensualite avant remise barree en petit
  - Mensualite apres remise en dessous
  - Petit badge colore "Remise" ou indicateur visuel (point bleu comme pour l'acompte)

### 3. Pas de modification sur `FinancialSummaryCard.tsx`

Ce composant n'est utilise nulle part et ne sera pas modifie. L'affichage sera integre directement dans `FinancialSection.tsx` qui est le composant actif.

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/detail/FinancialSection.tsx` | Afficher remise dans mensualite + impact marge |
| `src/components/offers/OffersTable.tsx` | Afficher remise dans la colonne mensualite |

---

## Resultat attendu

### Detail de l'offre
- Carte "Mensualite totale" : mensualite d'origine barree, ligne remise, mensualite finale
- Carte "Marge totale" : marge recalculee apres remise (formule Grenke)

### Liste des demandes
- Colonne "Mensualite" : mensualite d'origine barree + mensualite finale, avec indicateur visuel de remise

