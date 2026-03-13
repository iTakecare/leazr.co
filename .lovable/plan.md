

# Plan : Correction des montants sur le lien client

## Problème

Dans `ClientEquipmentSection.tsx`, le code multiplie `monthly_payment × quantity` (lignes 50 et 85). Or, selon la convention du projet, **`monthly_payment` est déjà le total de la ligne** (toutes quantités confondues). Le résultat : les montants sont doublés/triplés pour les lignes avec quantité > 1.

Exemple concret (screenshot) : Asus Pro Art 27 4K, qty 2
- Admin affiche correctement : unitaire 15,95€, total ligne 31,90€
- Client affiche faux : unitaire 31,90€, total ligne 63,80€ (31,90 × 2)
- Total client : 158,70€ au lieu de 126,80€

## Correction — `src/components/offers/ClientEquipmentSection.tsx`

1. **Ligne 50 (calcul total global)** : remplacer `monthlyPayment * quantity` par `monthlyPayment` seul
2. **Ligne 85 (mensualité totale par ligne)** : `totalMonthlyPayment = monthlyPayment` (déjà le total)
3. **Ligne 119 (mensualité unitaire affichée)** : afficher `monthlyPayment / quantity` pour obtenir le vrai prix unitaire

| Ligne | Avant | Après |
|---|---|---|
| 50 | `monthlyPayment * quantity` | `monthlyPayment` |
| 85 | `monthlyPayment * quantity` | `monthlyPayment` |
| 119 | `formatCurrency(monthlyPayment)` | `formatCurrency(monthlyPayment / quantity)` |

Un seul fichier modifié.

