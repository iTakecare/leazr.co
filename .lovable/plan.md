

# Ajouter le CA prévisionnel sous le CA Total

## Logique

Le **CA prévisionnel** = moyenne mensuelle des mois écoulés × 12. Cela projette le CA annuel en se basant sur les mois déjà réalisés.

## Modification : `src/components/dashboard/CompanyDashboard.tsx`

1. **Calculer le CA prévisionnel** après les moyennes existantes :
   ```
   const caPrevisionnel = moyennes.ca * 12;
   ```

2. **Carte "CA Total"** (ligne ~240-241) : garder le CA réel en grand, ajouter en dessous en petit entre parenthèses le prévisionnel :
   ```
   <p className="text-xl font-medium">XX XXX,XX €</p>
   <p className="text-xs text-muted-foreground">(Prév. : XX XXX,XX €)</p>
   ```

3. **Ligne TOTAL du tableau** (ligne ~378) : même principe sur la cellule CA total — afficher le réel en gras, et en dessous en petit le prévisionnel entre parenthèses.

Le prévisionnel ne s'affiche que si l'année sélectionnée est l'année en cours (pas de sens pour une année passée).

