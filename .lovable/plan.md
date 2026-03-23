

# Ajouter la colonne "CA Ventes Directes" au tableau mensuel du dashboard

## Constat

Les données `directSales` sont déjà calculées mois par mois (ligne 72 de `CompanyDashboard.tsx`) et les totaux/moyennes existent aussi (lignes 89, 99). Il manque simplement la colonne dans le tableau HTML.

## Modification unique : `src/components/dashboard/CompanyDashboard.tsx`

1. **Header** (après "CA Self-Leasing") : ajouter `<TableHead>` "CA Ventes Directes (€)" avec couleur `text-green-600`

2. **Lignes mensuelles** (après la cellule Self-Leasing) : ajouter `<TableCell>` affichant `month.directSales` en `text-green-700`

3. **Ligne TOTAL** : ajouter cellule avec `totals.directSales`

4. **Ligne MOYENNE** : ajouter cellule avec `moyennes.directSales`

5. **Mettre à jour le `colSpan`** du message "Aucune donnée" de 8 à 9

Aucune modification de service, hook ou migration requise -- les données sont déjà disponibles.

