
# Affichage de la remise dans le tableau d'equipements (Vue d'ensemble)

## Diagnostic

Le composant `NewEquipmentSection.tsx` (onglet "Vue d'ensemble" du detail d'une offre) ne tient pas compte de la remise commerciale dans ses calculs. La fonction `calculateTotals()` (lignes 229-240) utilise `totalMonthlyPayment` directement dans la formule Grenke sans soustraire `discount_amount`.

Cela impacte la ligne TOTAUX du tableau :
- **P.V. total** (montant finance) : affiche la valeur sans remise
- **Marge (%)** : calculee sans remise
- **Marge (euros)** : calculee sans remise
- **Total mensuel** : affiche la mensualite avant remise

## Correction

### Fichier : `src/components/offers/detail/NewEquipmentSection.tsx`

#### 1. Calcul du montant finance (lignes 229-240)

Soustraire `discount_amount` de la mensualite avant d'appliquer la formule Grenke :

```typescript
// Avant
effectiveFinancedAmount = (totalMonthlyPayment * 100) / coefficient;

// Apres
const discountAmount = (offer as any).discount_amount || 0;
const effectiveMonthly = totalMonthlyPayment - discountAmount;
effectiveFinancedAmount = (effectiveMonthly * 100) / coefficient;
```

#### 2. Ligne TOTAUX - Mensualite (lignes 1071-1085)

Afficher la mensualite avant remise barree et la mensualite apres remise si une remise est active :

```
Si discount_amount > 0 :
  - Mensualite d'origine barree (totalMonthlyPayment)
  - Mensualite remisee en gras (totalMonthlyPayment - discount_amount)
Sinon :
  - Mensualite normale (comportement actuel)
```

#### 3. Section remise commerciale (apres la ligne TOTAUX, avant la section Acompte, ligne 1094)

Ajouter un bloc visuel similaire a la section Acompte pour afficher les details de la remise :

```
Si offer.discount_amount > 0 :
  - Fond bleu clair avec bordure
  - Afficher : type de remise (% ou euros), valeur, montant de la remise
  - Afficher : mensualite avant / apres remise
  - Afficher : montant finance apres remise
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/detail/NewEquipmentSection.tsx` | Soustraire la remise dans calculateTotals(), afficher remise dans TOTAUX et section dediee |

## Resultat attendu

- Ligne TOTAUX : P.V. total, Marge %, Marge euros recalcules avec la remise
- Mensualite totale : avant remise barree + apres remise en gras
- Section "Remise commerciale" visible entre le tableau et la section Acompte
