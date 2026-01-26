

# Plan : Refonte Corporate du Dashboard Financier

## Analyse de l'état actuel

Le dashboard actuel présente :
- 4 cartes KPI en haut avec icônes colorées
- Un tableau mensuel détaillé
- Une sidebar avec 5 cartes de statistiques empilées
- Un style "flat" avec des couleurs pastels

## Améliorations Corporate Proposées

### 1. Simplification des icônes dans les KPI Cards

**Avant** : Icônes dans des cercles colorés (`bg-primary/10`)
**Après** : Icônes simples sans fond, ton gris discret

| Élément | Modification |
|---------|--------------|
| Div icône | Supprimer `p-2 rounded-lg bg-primary/10` |
| Icône | Changer `text-primary` → `text-slate-400` |

### 2. Bordures subtiles sur les cartes

Ajouter une bordure légère sur toutes les cards pour un look plus structuré :

```tsx
<Card className="border border-slate-200">
```

### 3. En-tête du tableau plus sobre

**Avant** : `bg-primary/5` (teinte bleue)
**Après** : `bg-slate-50` (gris neutre corporate)

### 4. Lignes TOTAL et MOYENNE plus discrètes

**Avant** : `bg-green-50` et `bg-blue-50` (couleurs vives)
**Après** : 
- TOTAL : `bg-slate-100` avec texte `text-slate-900`
- MOYENNE : `bg-slate-50` avec texte `text-slate-600`

### 5. Cards sidebar plus uniformes

Remplacer les icônes colorées par des icônes grises :

| Card | Icône actuelle | Nouvelle icône |
|------|----------------|----------------|
| Contrats Réalisés | `text-emerald-500` | `text-slate-500` |
| En Attente | `text-orange-500` | `text-slate-500` |
| Refusés | `text-rose-500` | `text-slate-500` |
| Ventes Directes | `text-primary` | `text-slate-500` |
| Prévisionnel | `text-primary` | `text-slate-500` |

### 6. Badges et indicateurs dans le tableau

Les valeurs positives (marge) restent en vert discret, les notes de crédit en gris plutôt que violet.

---

## Fichiers à modifier

### `src/components/dashboard/CompanyDashboard.tsx`

**Lignes 197-255 - KPI Cards** :
- Supprimer le background des icônes
- Changer les couleurs des icônes en `text-slate-400`

**Lignes 269-295 - En-tête tableau** :
- `bg-primary/5` → `bg-slate-50`
- `text-purple-600` → `text-slate-600`

**Lignes 306-307, 333-340 - Notes de crédit et TOTAL** :
- `text-purple-600` → `text-slate-500`
- `bg-green-50` → `bg-slate-100`
- `text-green-600` → `text-emerald-700` (plus sobre)

**Lignes 342-349 - MOYENNE** :
- `bg-blue-50` → `bg-slate-50`
- `text-blue-600` → `text-slate-600`

**Lignes 391-560 - Cards sidebar** :
- Changer toutes les icônes colorées en `text-slate-500`
- Uniformiser les styles des cartes

---

## Résumé des modifications

| Fichier | Lignes | Modification |
|---------|--------|--------------|
| CompanyDashboard.tsx | 205-206 | Icône CA sans bg, couleur slate |
| CompanyDashboard.tsx | 219-220 | Icône Achats sans bg, couleur slate |
| CompanyDashboard.tsx | 235-236 | Icône Marge sans bg, couleur slate |
| CompanyDashboard.tsx | 249-250 | Icône Taux sans bg, couleur slate |
| CompanyDashboard.tsx | 269 | Header tableau → bg-slate-50 |
| CompanyDashboard.tsx | 272, 306, 333 | Notes crédit → text-slate-500 |
| CompanyDashboard.tsx | 310, 313, 339, 340 | Valeurs marge → text-emerald-700 |
| CompanyDashboard.tsx | 330 | TOTAL → bg-slate-100 |
| CompanyDashboard.tsx | 342-348 | MOYENNE → bg-slate-50, text-slate-600 |
| CompanyDashboard.tsx | 394, 426, 458, 486, 518 | Icônes sidebar → text-slate-500 |

---

## Résultat attendu

- Interface plus professionnelle et épurée
- Palette de couleurs sobre (gris/slate dominant)
- Distinction visuelle conservée par les valeurs numériques
- Cohérence avec le style WinBroker déjà appliqué

