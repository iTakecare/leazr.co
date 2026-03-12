

# Plan : Modale d'export PDF du Dashboard avec graphiques et comparaison multi-années

## Résumé

Créer une modale accessible depuis le bouton "Exporter PDF" du dashboard financier. L'utilisateur pourra choisir les sections, les graphiques et les années à inclure. Le PDF sera généré côté client avec `jsPDF` + `html2canvas` à partir d'un rendu caché dans le DOM.

## Architecture

```text
CompanyDashboard.tsx
  └─ onClick "Exporter PDF" → ouvre DashboardPDFExportModal
       ├─ Panneau gauche : Options (checkboxes sections, graphiques, sélecteur années)
       └─ Panneau droit : Aperçu live (miniature du contenu)
       └─ Bouton "Générer PDF"
            └─ Rend un div caché avec les sections sélectionnées
            └─ html2canvas → jsPDF → téléchargement
```

## Composants à créer

### 1. `src/components/dashboard/DashboardPDFExportModal.tsx`

Modale avec :
- **Sections à inclure** (checkboxes, toutes cochées par défaut) :
  - KPI Cards (CA Total, Achats, Marge, Taux)
  - Tableau mensuel
  - Stats par statut (Réalisés, En Attente, Refusés, Ventes Directes, Prévisionnel)
  - Factures en retard
- **Graphiques** (checkboxes) :
  - Barres CA vs Achats vs Marge
  - Courbe évolution marge %
  - Camembert répartition CA (Leasing / Self-Leasing / Ventes Directes)
  - Barres empilées CA par type
- **Années** : multi-select parmi les années disponibles (2022 → année courante). Si plusieurs années, les graphiques superposent les données.

Props : reçoit les données du dashboard (`monthlyData`, `totals`, `moyennes`, `contractStats`, `overdueInvoices`, `selectedYear`, `availableYears`).

### 2. `src/components/dashboard/DashboardPDFContent.tsx`

Composant React rendu dans un div caché (`position: absolute, left: -9999px`) qui contient le contenu formaté pour le PDF :
- En-tête avec logo entreprise, titre "Rapport Financier", années sélectionnées
- KPI cards en grille 4 colonnes
- Tableau mensuel stylé pour impression (fond blanc, bordures nettes)
- Graphiques Recharts (rendus statiquement à taille fixe ~800×400px)
- Stats par statut en grille
- Factures en retard

Pour la comparaison multi-années : le hook `useCompanyDashboard` sera appelé pour chaque année supplémentaire sélectionnée, et les données seront superposées sur les graphiques (ex: barres groupées par année, courbes multiples).

### 3. Logique de génération PDF

Utiliser `html2canvas` pour capturer le div caché, puis `jsPDF` pour créer un document A4 multi-pages :
- Découpage automatique en pages A4
- Marges de 10mm
- Résolution 2x pour la netteté

## Modifications de fichiers existants

| Fichier | Modification |
|---|---|
| `src/components/dashboard/CompanyDashboard.tsx` | Ajouter state `showPDFModal`, onClick sur le bouton "Exporter PDF", importer et rendre la modale avec toutes les données nécessaires |
| `src/components/dashboard/DashboardPDFExportModal.tsx` | **Nouveau** - Modale de configuration |
| `src/components/dashboard/DashboardPDFContent.tsx` | **Nouveau** - Contenu rendu pour capture PDF |

## Détails techniques

- Les graphiques Recharts sont rendus dans le div caché avec des dimensions fixes (pas de `ResponsiveContainer`) pour garantir un rendu correct par `html2canvas`
- Pour le multi-années, on fetch les données des années supplémentaires via `supabase.rpc('get_monthly_financial_data', { p_year })` directement dans la modale
- Le camembert utilise `PieChart` de Recharts avec les 3 segments : CA Leasing, Self-Leasing, Ventes Directes
- Pas de nouvelle dépendance nécessaire (`jspdf` et `html2canvas` sont déjà installés)

