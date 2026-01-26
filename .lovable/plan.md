
# Plan : Correction des textes blancs illisibles dans l'application

## Problème identifié

Plusieurs éléments de l'interface ont du texte blanc sur des fonds clairs, les rendant illisibles. L'analyse a révélé les problèmes suivants :

### 1. VariantSelector.tsx (Ligne 124)
Le bouton utilise `bg-white` quand non sélectionné mais ne définit pas de couleur de texte explicite :
```tsx
className={`... ${isSelected ? "bg-primary text-white" : "bg-white"} ...`}
```
**Problème** : Quand le bouton n'est pas sélectionné, il a un fond blanc mais peut hériter d'une couleur de texte blanche de la variante outline.

### 2. OfferCompleteHistory.tsx (Lignes 49, 57)
Les compteurs dans les onglets utilisent `bg-primary text-primary-foreground` qui devrait fonctionner, mais le texte peut être difficile à lire dans certains contextes de tabs.

### 3. OfferWorkflowSection.tsx (Ligne 242)
Même problème avec un compteur dans un tab trigger.

### 4. Boutons avec variante "default" sans fond explicite
Les boutons "Nouvelle demande" et "Liste" utilisent la variante `default` qui définit `bg-primary text-primary-foreground`. Normalement cela devrait fonctionner, mais il semble y avoir un conflit de styles.

---

## Solution proposée

### Fichier 1 : `src/components/catalog/VariantSelector.tsx`

**Ligne 124** - Ajouter `text-foreground` pour les boutons non sélectionnés :

| Avant | Après |
|-------|-------|
| `isSelected ? "bg-primary text-white" : "bg-white"` | `isSelected ? "bg-primary text-white" : "bg-white text-foreground"` |

### Fichier 2 : `src/components/offers/OfferCompleteHistory.tsx`

**Lignes 49 et 57** - Changer la couleur du compteur pour assurer la lisibilité :

| Avant | Après |
|-------|-------|
| `bg-primary text-primary-foreground` | `bg-primary/10 text-primary` |

### Fichier 3 : `src/components/offers/OfferWorkflowSection.tsx`

**Ligne 242** - Même correction que ci-dessus :

| Avant | Après |
|-------|-------|
| `bg-primary text-primary-foreground` | `bg-primary/10 text-primary` |

### Fichier 4 : `src/pages/Offers.tsx`

**Lignes 151-168** - S'assurer que les boutons de vue ont un style explicite pour le texte :

Pour les boutons "Liste" et "Kanban", ajouter des classes explicites pour garantir la lisibilité du texte dans les deux états (actif et inactif).

**Bouton Liste (lignes 151-159)** :
```tsx
<Button 
  variant={viewMode === 'list' ? 'default' : 'ghost'} 
  size="sm"
  onClick={() => setViewMode('list')} 
  className={`rounded-none px-3 ${viewMode === 'list' ? 'text-white' : 'text-foreground'}`}
>
```

**Bouton Kanban (lignes 160-168)** :
```tsx
<Button 
  variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
  size="sm"
  onClick={() => setViewMode('kanban')} 
  className={`rounded-none px-3 ${viewMode === 'kanban' ? 'text-white' : 'text-foreground'}`}
>
```

### Fichier 5 : `src/pages/AmbassadorPages/AmbassadorOffersPage.tsx`

**Lignes 288-305** - Appliquer la même correction aux boutons de vue dans la page Ambassador :

```tsx
className={`rounded-none px-3 ${viewMode === 'list' ? 'text-white' : 'text-foreground'}`}
// et
className={`rounded-none px-3 ${viewMode === 'kanban' ? 'text-white' : 'text-foreground'}`}
```

---

## Récapitulatif des modifications

| Fichier | Ligne(s) | Modification |
|---------|----------|--------------|
| `src/components/catalog/VariantSelector.tsx` | 124 | Ajouter `text-foreground` pour les boutons non sélectionnés |
| `src/components/offers/OfferCompleteHistory.tsx` | 49, 57 | Changer en `bg-primary/10 text-primary` |
| `src/components/offers/OfferWorkflowSection.tsx` | 242 | Changer en `bg-primary/10 text-primary` |
| `src/pages/Offers.tsx` | 155, 164 | Ajouter classes conditionnelles pour couleur du texte |
| `src/pages/AmbassadorPages/AmbassadorOffersPage.tsx` | 292, 301 | Ajouter classes conditionnelles pour couleur du texte |

---

## Résultat attendu

- Le texte des boutons de sélection de variantes sera toujours lisible (texte sombre sur fond blanc)
- Les compteurs dans les onglets auront un fond bleu clair avec texte bleu au lieu de blanc sur bleu
- Les boutons "Liste" et "Kanban" auront toujours un texte visible (blanc quand actif sur fond bleu, sombre quand inactif)
- Le bouton "Nouvelle demande" restera avec son style par défaut (fond bleu, texte blanc)
