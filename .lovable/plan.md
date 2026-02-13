

# Filtre multi-statuts sur la page Commandes fournisseurs

## Objectif

Remplacer le filtre de statut actuel (selection unique via `Select`) par un systeme de selection multiple permettant de cocher plusieurs statuts simultanement (ex: "A commander" + "Commande").

## Modification

### Fichier : `src/pages/admin/EquipmentOrders.tsx`

### 1. Changer le state du filtre

- Remplacer `statusFilter: OrderStatus | 'all'` par `statusFilters: OrderStatus[]` (tableau)
- Valeur par defaut : `['to_order']` (comme actuellement)

### 2. Remplacer le Select par des ToggleGroup ou des boutons avec Checkbox

Utiliser des boutons toggle pour chaque statut, avec les couleurs de `ORDER_STATUS_CONFIG`. Chaque bouton peut etre active/desactive independamment. Un bouton "Tous" permet de tout selectionner/deselectionner.

### 3. Adapter le filtre

Modifier `filteredItems` :
- Si `statusFilters` est vide, afficher tous les items
- Sinon, filtrer les items dont le `order_status` est dans `statusFilters`

### 4. Composants utilises

- `ToggleGroup` et `ToggleGroupItem` deja disponibles dans le projet (`@radix-ui/react-toggle-group`)
- Ou bien de simples `Button` avec `variant` conditionnel selon si le statut est selectionne

### Details techniques

| Element | Detail |
|---------|--------|
| Fichier | `src/pages/admin/EquipmentOrders.tsx` uniquement |
| State | `useState<OrderStatus[]>(['to_order'])` remplace `useState<OrderStatus / 'all'>('to_order')` |
| UI | Boutons toggle colores pour chaque statut + bouton "Tous" |
| Filtre | `statusFilters.length === 0` = tout afficher, sinon filtrer par inclusion dans le tableau |

