

# Prévisionnel basé sur les contrats self-leasing connus (toutes colonnes)

## Problème actuel

Le "prévisionnel" est calculé comme `moyenne × 12`, ce qui est incorrect. Le vrai prévisionnel doit être : **total réel des mois écoulés + revenus self-leasing connus pour les mois restants** (avril → décembre).

Les contrats self-leasing ont une mensualité fixe et une durée connue — leur contribution future est certaine.

## Approche

### 1. `useCompanyDashboard.ts` — Exposer les projections self-leasing futures

Ajouter une nouvelle query `selfLeasingProjection` qui, pour l'année en cours uniquement, calcule le self-leasing des mois **restants** (du mois suivant jusqu'à décembre) :

- Requête les contrats `is_self_leasing = true`, statuts actifs, dont la période chevauche les mois futurs de l'année
- Pour chaque contrat : calcule les mois actifs **après le mois courant** jusqu'à fin d'année
- Calcule :
  - `futureRevenue` = `monthly_payment × mois futurs actifs`
  - `futurePurchases` = `(equipmentCost / duration) × mois futurs actifs`
  - `futureMargin` = `futureRevenue - futurePurchases`

Retourner ces valeurs dans le hook via un nouvel objet `selfLeasingProjection`.

### 2. `CompanyDashboard.tsx` — Calcul du prévisionnel par colonne

Calculer le prévisionnel pour **chaque colonne** :

```text
previsionnel = {
  ca:          elapsedTotals.ca + projection.futureRevenue,
  caLeasing:   elapsedTotals.caLeasing,        // pas de futur connu
  selfLeasing: elapsedTotals.selfLeasing + projection.futureRevenue,
  directSales: elapsedTotals.directSales,       // pas de futur connu
  achats:      elapsedTotals.achats + projection.futurePurchases,
  marge:       prev.ca - prev.achats,
}
```

### 3. `CompanyDashboard.tsx` — Affichage dans la ligne TOTAL

Pour **chaque cellule** de la ligne TOTAL (CA Total, CA Leasing, CA Self-Leasing, Ventes Directes, Achats, Marge) :
- En grand : le total réel (mois écoulés uniquement)
- En petit dessous `(Prév. : XX XXX,XX €)` : le prévisionnel

Même traitement pour la carte KPI "CA Total" dans le header.

Ne s'affiche que si `isCurrentYear === true`.

### Fichiers modifiés

1. `src/hooks/useCompanyDashboard.ts` — nouvelle query + exposition dans le return
2. `src/components/dashboard/CompanyDashboard.tsx` — calcul prévisionnel + affichage toutes colonnes

