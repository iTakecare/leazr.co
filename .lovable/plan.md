
Objectif
- Faire en sorte que, quand vous saisissez un P.V. unitaire (ex: 621,80 €) en mode édition et que vous enregistrez, la valeur affichée après sauvegarde soit exactement celle stockée en base (et pas une valeur “ré-ajustée” type 622,04).
- Corriger aussi l’affichage “dans la ligne” pendant l’édition (actuellement, certaines cellules continuent d’afficher des valeurs recalculées au lieu des valeurs que vous venez de taper).

Constat (cause racine)
- La sauvegarde en base fonctionne : le réseau montre bien selling_price = 621.8.
- L’affichage, lui, utilise equipmentSellingPrice = adjustedSellingPrices[item.id] (calculé via une répartition “Largest Remainder”).
- En mode leasing, calculateAllSellingPrices “recalcule/répartit” encore les prix même quand selling_price est renseigné, à cause de la détection “manuel” basée sur l’écart vs (PA × (1+marge)). Or, quand vous éditez le P.V., on recalcule aussi la marge pour correspondre au P.V. → l’écart devient ~0 → la ligne n’est plus considérée “manuelle” → elle repasse dans la redistribution → 622,04.

Changements prévus (1 seul composant : src/components/offers/detail/NewEquipmentSection.tsx)

1) Ne plus redistribuer un équipement qui a un selling_price en base (mode leasing)
- Modifier calculateAllSellingPrices (branche leasing) pour considérer comme “fixe” toute ligne ayant selling_price > 0 (pas “si écart > 1€”).
- Nouvelle règle :
  - Si item.selling_price > 0 : adjustedPrices[item.id] = round2(item.selling_price * item.quantity)
  - La redistribution ne s’applique que sur les lignes sans selling_price (null/0).
- Cas “100% des lignes ont selling_price” :
  - On retourne directement adjustedPrices (aucune redistribution).
- Cas mixte (certaines lignes sans selling_price) :
  - remainingTotal = targetTotalRounded - somme(des lignes fixes)
  - Redistribution (Largest Remainder) uniquement sur items sans selling_price, proportionnellement à (PA * quantité).
- Ajout d’un helper local round2 (arrondi centimes) pour éviter les micro-décimales (ex: 1839.9198999999999).

Résultat attendu
- Après sauvegarde, le P.V. affiché correspond strictement au selling_price stocké en base (donc 621,80 € restera 621,80 €).

2) En mode édition, afficher les valeurs “éditées” dans la ligne (pas les valeurs adjusted)
Problème actuel
- Pendant l’édition, la cellule “P.V total” (et la marge €) affichent encore adjustedSellingPrices/adjustedMargins, donc vous voyez une valeur “622,04” même si l’input contient “621,80”.

Correction
- Dans le rendu de la ligne (equipment.map):
  - Si isEditing :
    - sellingTotalDisplayed = round2((editedValues.selling_price || 0) * (editedValues.quantity || 1))
    - marginEuroDisplayed = round2(sellingTotalDisplayed - (editedValues.purchase_price * editedValues.quantity))
    - marginPercentDisplayed (en lecture seule si on veut) = (sellingTotalDisplayed - purchaseTotal)/purchaseTotal * 100 (optionnel, sinon on garde l’input)
  - Si !isEditing :
    - sellingTotalDisplayed = adjustedSellingPrices[item.id]
    - marginEuroDisplayed = adjustedMargins[item.id]
- Ainsi, dès que vous tapez 621,80, la ligne montre immédiatement 621,80 (total) et la marge correspondante, puis après Save, la même valeur persiste.

3) Vérifications ciblées (scénarios)
- Scénario A (celui de votre capture) :
  1. Modifier P.V unitaire Samsung à 621,80
  2. En mode édition : P.V total doit afficher 621,80 (et non 622,04)
  3. Cliquer Enregistrer
  4. Après refresh : P.V unitaire doit afficher 621,80 (format monnaie), P.V total = 621,80
- Scénario B (quantité > 1) :
  - Mettre quantité = 3 et P.V unitaire = 100,00
  - Affichage P.V total = 300,00 ; après Save, identique
- Scénario C (ligne sans selling_price) :
  - Si une ligne a selling_price null/0, elle seule peut être redistribuée ; les lignes avec selling_price restent inchangées.

Risques / points d’attention
- On supprime l’ancienne logique “manuel si écart > 1€” car elle est incompatible avec le recalcul automatique de la marge lors de l’édition du P.V.
- La redistribution n’interviendra plus pour “corriger” des centimes sur des lignes qui ont déjà un selling_price explicite : c’est volontaire, car votre exigence est que le prix saisi et sauvegardé reste la source de vérité pour l’affichage.

Livrable
- 1 fichier modifié uniquement : src/components/offers/detail/NewEquipmentSection.tsx
