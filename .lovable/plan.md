

# Afficher les prix originaux barrés dans la ligne TOTAUX

## Contexte

Dans la vue d'ensemble du detail d'une offre (NewEquipmentSection), la ligne TOTAUX affiche deja le prix original barre pour la colonne "Total mensuel" quand une remise commerciale est active. L'utilisateur souhaite le meme traitement pour les colonnes **P.V. total**, **Marge (%)** et **Marge (euro)**.

## Solution

Modifier la ligne TOTAUX pour afficher, quand une remise est active (`discount_amount > 0`) :
- Le montant original barre au-dessus
- Le montant apres remise en dessous (en gras, colore)

### Calcul des valeurs originales (avant remise)

Les valeurs actuelles (`effectiveFinancedAmount`, `totalMargin`, `marginPercentage`) sont deja calculees **apres remise**. Il faut calculer les valeurs **avant remise** :

- **P.V. total original** = `totalMonthlyPayment * 100 / coefficient` (Grenke sans deduction de remise)
- **Marge originale (euro)** = P.V. total original - totalPrice
- **Marge originale (%)** = marge originale / totalPrice * 100

### Fichier modifie

`src/components/offers/detail/NewEquipmentSection.tsx`

### Changements

#### 1. Ajouter le calcul des valeurs avant remise dans `calculateTotals` (lignes 266-277)

Ajouter de nouveaux champs retournes :
- `originalFinancedAmount` : montant finance sans la remise
- `originalMargin` : marge en euro sans la remise
- `originalMarginPercentage` : marge en % sans la remise

#### 2. Modifier la cellule P.V. total (lignes 1011-1015)

Quand `discount_amount > 0`, afficher :
```
[originalFinancedAmount barre, petit, gris]
[effectiveFinancedAmount en gras vert]
```

#### 3. Modifier la cellule Marge % (lignes 1017-1021)

Quand `discount_amount > 0`, afficher :
```
[originalMarginPercentage barre, petit, gris]
[marginPercentage en gras]
```

#### 4. Modifier la cellule Marge euro (lignes 1023-1027)

Quand `discount_amount > 0`, afficher :
```
[originalMargin barre, petit, gris]
[totalMargin en gras vert]
```

Le pattern est identique a celui deja utilise pour la colonne Total mensuel (lignes 1078-1091), avec `line-through` et `text-muted-foreground` pour les valeurs originales.
