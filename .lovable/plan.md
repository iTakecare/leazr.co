
# Correction visuelle du prix barré dans le PDF

## Problème

La ligne de `text-decoration: line-through` apparaît trop haute visuellement. Cela se produit car le texte barré a une taille de police différente (`fontSize.sm`) à l'intérieur d'un conteneur plus grand (`fontSize.lg`), ce qui décale la ligne de barrage.

## Solution

Remplacer `text-decoration: line-through` par une approche CSS manuelle avec un trait positionné via `background` + `linear-gradient` ou en séparant les prix barrés sur leur propre ligne au-dessus du prix remisé. La seconde approche est plus claire visuellement et évite les problèmes d'alignement.

### Fichier : `src/components/offers/CommercialOffer.tsx`

#### Prix unitaire (lignes 516-530)
Séparer le prix barré sur sa propre ligne au-dessus du prix remisé, au lieu de les mettre côte à côte :

```text
AVANT :  44,95 € 41,80 € HTVA/mois • unitaire (même ligne)
APRES :  44,95 €  (barré, propre ligne, petite taille)
         41,80 € HTVA/mois • unitaire (ligne suivante)
```

#### Prix total (lignes 531-557)
Même approche pour le total par équipement :

```text
AVANT :  899,00 € 836,07 € HTVA/mois (même ligne, tailles mixtes)
APRES :  899,00 €  (barré, propre ligne, taille uniforme)
         836,07 € HTVA/mois (ligne suivante, gros et bleu)
```

En mettant chaque prix barré sur sa propre ligne avec une taille de police cohérente, le `line-through` sera correctement centré sur le texte.

## Détails techniques

Restructurer le rendu JSX des deux blocs (unitaire et total) pour :
1. Afficher le prix original barré dans un `div` dédié (pas un `span` inline)
2. Utiliser la même `fontSize` pour le texte et sa décoration `line-through`
3. Afficher le prix remisé dans un `div` séparé en dessous

Seul le fichier `src/components/offers/CommercialOffer.tsx` est modifié (lignes 514-557).
