

# Plan : Lignes cliquables et tri sur toutes les colonnes

## Objectif

1. **Rendre toute la ligne cliquable** pour naviguer vers le détail de l'offre
2. **Ajouter le tri sur toutes les colonnes** du tableau des offres

---

## Modifications à apporter

### Fichier : `src/components/offers/OffersTable.tsx`

#### 1. Étendre le type de tri pour inclure toutes les colonnes

```tsx
// Ligne 64 - Ajouter les nouvelles colonnes au type
type OfferSortColumn = 'dossier_number' | 'date' | 'client' | 'company' | 'type' | 'equipment' | 'source' | 'leaser' | 'purchase_amount' | 'financed_amount' | 'margin_amount' | 'margin_percent' | 'commission' | 'monthly_payment' | 'status' | 'reminder';
```

#### 2. Ajouter la logique de tri pour les nouvelles colonnes

```tsx
// Dans sortedOffers useMemo (lignes 269-294)
switch (sortColumn) {
  // ... cas existants ...
  
  case 'type':
    comparison = (a.type || '').localeCompare(b.type || '', 'fr');
    break;
  case 'equipment':
    const equipA = formatAllEquipmentForCell(a.equipment_data) || '';
    const equipB = formatAllEquipmentForCell(b.equipment_data) || '';
    comparison = equipA.localeCompare(equipB, 'fr');
    break;
  case 'source':
    comparison = (a.source || '').localeCompare(b.source || '', 'fr');
    break;
  case 'leaser':
    comparison = (a.leaser?.name || '').localeCompare(b.leaser?.name || '', 'fr');
    break;
  case 'purchase_amount':
    comparison = (a.equipment_total || 0) - (b.equipment_total || 0);
    break;
  case 'financed_amount':
    comparison = (getEffectiveFinancedAmount(a) || 0) - (getEffectiveFinancedAmount(b) || 0);
    break;
  case 'margin_amount':
    comparison = (calculateOfferMarginAmount(a) || 0) - (calculateOfferMarginAmount(b) || 0);
    break;
  case 'margin_percent':
    comparison = (calculateOfferMargin(a) || 0) - (calculateOfferMargin(b) || 0);
    break;
  case 'commission':
    comparison = (a.ambassador_commission || 0) - (b.ambassador_commission || 0);
    break;
  case 'reminder':
    // Tri par statut de rappel
    const reminderA = offersReminders[a.id]?.status || '';
    const reminderB = offersReminders[b.id]?.status || '';
    comparison = reminderA.localeCompare(reminderB, 'fr');
    break;
}
```

#### 3. Remplacer les TableHead simples par SortableTableHead

| Colonne | Avant | Après |
|---------|-------|-------|
| Type | `<TableHead>Type</TableHead>` | `<SortableTableHead column="type" label="Type" .../>` |
| Équip. | `<TableHead>Équip.</TableHead>` | `<SortableTableHead column="equipment" label="Équip." .../>` |
| Source | `<TableHead>Source</TableHead>` | `<SortableTableHead column="source" label="Source" .../>` |
| Bailleur | `<TableHead>Bailleur</TableHead>` | `<SortableTableHead column="leaser" label="Bailleur" .../>` |
| Mt. achat | `<TableHead>Mt. achat</TableHead>` | `<SortableTableHead column="purchase_amount" label="Mt. achat" .../>` |
| Mt. financé | `<TableHead>Mt. financé</TableHead>` | `<SortableTableHead column="financed_amount" label="Mt. financé" .../>` |
| Marge € | `<TableHead>Marge €</TableHead>` | `<SortableTableHead column="margin_amount" label="Marge €" .../>` |
| Marge % | `<TableHead>Marge %</TableHead>` | `<SortableTableHead column="margin_percent" label="Marge %" .../>` |
| Comm. | `<TableHead>Comm.</TableHead>` | `<SortableTableHead column="commission" label="Comm." .../>` |
| Rappel | `<TableHead>Rappel</TableHead>` | `<SortableTableHead column="reminder" label="Rappel" .../>` |

#### 4. Rendre la ligne entière cliquable

```tsx
// Ligne 373-374 - Ajouter onClick et cursor-pointer au TableRow
{sortedOffers.map((offer) => (
  <TableRow 
    key={offer.id} 
    className="h-10 cursor-pointer hover:bg-muted/50"
    onClick={() => handleViewDetails(offer.id)}
  >
```

#### 5. Empêcher la propagation sur les éléments interactifs

Pour éviter que le clic sur le menu Actions, les tooltips ou les boutons de rappel ne déclenche la navigation :

```tsx
// Dans la cellule Actions (ligne 538)
<TableCell className="..." onClick={(e) => e.stopPropagation()}>
  {/* Menu dropdown */}
</TableCell>

// Dans la cellule Rappel (ligne 522)
<TableCell className="..." onClick={(e) => e.stopPropagation()}>
  {/* ReminderIndicator et boutons */}
</TableCell>
```

---

## Récapitulatif des changements

| Élément | Avant | Après |
|---------|-------|-------|
| Clic sur ligne | Pas de navigation | Navigation vers `/offers/{id}` |
| Colonnes triables | 6 colonnes | Toutes les colonnes (16) |
| Cursor sur ligne | Default | `cursor-pointer` |
| Hover sur ligne | Basique | `hover:bg-muted/50` |

---

## Colonnes avec tri après modification

1. N° Demande ✅ (existant)
2. Date offre ✅ (existant)
3. Client ✅ (existant)
4. Entreprise ✅ (existant)
5. Type ✅ (nouveau)
6. Équip. ✅ (nouveau)
7. Source ✅ (nouveau)
8. Bailleur ✅ (nouveau)
9. Mt. achat ✅ (nouveau)
10. Mt. financé ✅ (nouveau)
11. Marge € ✅ (nouveau)
12. Marge % ✅ (nouveau)
13. Comm. ✅ (nouveau)
14. Mensualité ✅ (existant)
15. Statut ✅ (existant)
16. Rappel ✅ (nouveau)
17. Actions ❌ (pas de tri - colonne d'actions)

---

## Fichier impacté

| Fichier | Modifications |
|---------|---------------|
| `src/components/offers/OffersTable.tsx` | Type de tri étendu, logique de tri complète, TableHead → SortableTableHead, ligne cliquable avec stopPropagation |

