

# Regroupement des articles identiques avec vue accordeon

## Objectif
Quand plusieurs articles partagent le meme **titre + marque + modele**, ils seront automatiquement regroupes sur une seule ligne "parent" dans le tableau. En cliquant sur cette ligne, un sous-tableau se deploie pour afficher chaque unite individuelle avec ses specificites (prix, fournisseur, N de serie, etat, etc.).

## Comportement

```text
Ligne parent (cliquable)
+--------------------------------------------------+
| > Apple Airpods 3 | Apple | Airpods 3 | Qty: 2  |
+--------------------------------------------------+
  clic => deploie les unites :
  +------------------------------------------------+
  | Unite 1 | SN: xxx | Fournisseur A | 150.00 EUR |
  | Unite 2 | SN: yyy | Fournisseur B | 140.00 EUR |
  +------------------------------------------------+
```

### Ligne parent - informations affichees
- Titre, marque, modele (communs)
- Quantite totale (nombre d'unites dans le groupe)
- Prix total cumule
- Badge indiquant le nombre d'unites
- Fleche d'expansion (ChevronRight / ChevronDown)

### Lignes enfant (unites) - informations affichees
- Toutes les colonnes habituelles : N de serie, statut, etat, fournisseur, prix unitaire, contrat, date
- Boutons d'action individuels (editer, dupliquer, supprimer)

### Articles uniques
- Les articles sans doublon restent affiches normalement, comme une ligne simple sans accordeon

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/components/stock/StockItemList.tsx` | Ajout de la logique de regroupement et du rendu accordeon |

## Detail technique

1. **Cle de regroupement** : `${title.toLowerCase()}|${(brand||'').toLowerCase()}|${(model||'').toLowerCase()}`
2. **Nouveau `useMemo`** qui transforme la liste `filtered` en groupes :
   - Si un groupe contient 1 seul item : rendu classique (ligne simple)
   - Si un groupe contient 2+ items : ligne parent cliquable + sous-lignes depliables
3. **State `expandedGroups`** (Set de cles) pour gerer quels groupes sont ouverts/fermes
4. **Ligne parent** : nouvelle fonction `renderGroupRow(key, items)` affichant les infos communes et un badge de quantite
5. **Lignes enfant** : reutilisation de la fonction `renderRow` existante avec un style legerement indente (fond plus clair)
6. **Compatible avec le groupement existant** (par marque, statut, etc.) : le regroupement par article identique s'applique a l'interieur de chaque groupe
7. **Compatible avec la recherche et le tri** : le regroupement s'applique apres le filtrage et le tri

