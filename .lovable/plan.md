
# Plan : Rendre la barre d'onglets plus compacte

## Analyse du problème

La barre d'onglets actuelle s'étend sur toute la largeur disponible à cause de :
- `TabsList` avec `w-full` dans le composant `tabs.tsx`
- `border-b` qui crée une ligne sur toute la largeur
- Les onglets ne sont pas contenus dans un espace délimité

Les cartes KPI en dessous utilisent une grille `grid-cols-5` avec des cartes individuelles bien définies.

## Solution proposée

Modifier le style des `TabsList` dans `OffersFilter.tsx` pour avoir un design plus compact :
- Ajouter un fond gris clair (`bg-slate-100`) avec coins arrondis
- Supprimer la bordure inférieure qui s'étend sur toute la largeur
- Réduire le padding des déclencheurs d'onglets
- Utiliser `w-fit` au lieu de `w-full` pour que chaque groupe d'onglets soit compact

## Fichier à modifier

**`src/components/offers/OffersFilter.tsx`**

### Modifications des TabsList

Chaque `TabsList` recevra les classes suivantes :
```tsx
<TabsList className="bg-slate-100 rounded-lg p-1">
```

Et chaque `TabsTrigger` sera plus compact :
```tsx
<TabsTrigger className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
```

## Détail des changements

| Ligne | Avant | Après |
|-------|-------|-------|
| 28 | `<TabsList>` | `<TabsList className="bg-slate-100 rounded-lg p-1">` |
| 29-32 | `<TabsTrigger value="...">` | `<TabsTrigger value="..." className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">` |
| 39 | `<TabsList>` | `<TabsList className="bg-slate-100 rounded-lg p-1">` |
| 40-43 | `<TabsTrigger value="...">` | `<TabsTrigger value="..." className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">` |
| 48 | `<TabsList>` | `<TabsList className="bg-slate-100 rounded-lg p-1">` |
| 49-52 | `<TabsTrigger value="...">` | `<TabsTrigger value="..." className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">` |

## Résultat visuel attendu

```text
AVANT:
|--À traiter--|--Acceptées--|--Facturé--|--Refusées--|-----------------------------|
______________________________________________________________________________

APRÈS:
+--------------------------------------------------+
| À traiter | Acceptées | Facturé | Refusées       |  (fond gris, compact)
+--------------------------------------------------+
```

Les trois groupes d'onglets (Statut, Type, Source) seront visuellement séparés avec chacun leur fond gris arrondi, alignés avec la largeur des cartes KPI en dessous.

## Impact

- Aucun changement fonctionnel
- Meilleure cohérence visuelle avec les cartes KPI
- Design plus moderne et compact
- Seul le fichier `OffersFilter.tsx` sera modifié
