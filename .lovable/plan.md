

## Plan : Loader avec effet de vague remplissant le logo

### Concept
Créer un composant `WaveLoader` qui affiche le logo de la plateforme en niveaux de gris, avec un effet de vague animée qui remplit progressivement le logo de bas en haut (simulant la progression du chargement). L'effet utilise un SVG `clipPath` avec le logo comme masque et une animation CSS de vague à l'intérieur.

### Technique

Le principe repose sur un **masque CSS** :
1. Le logo est affiché en gris clair (version "vide")
2. Par-dessus, une copie colorée du logo est masquée par un `clip-path` animé
3. Une animation de vague (`wave`) monte progressivement de 0% à 100% en boucle ou selon la durée estimée
4. L'effet de vague utilise un `path` SVG sinusoïdal qui oscille horizontalement pendant la montée

```text
┌─────────────┐
│  Logo gris   │  ← fond statique
│ ┌───────────┐│
│ │ Wave fill ││  ← montée progressive avec ondulation
│ │~~~~~~~~~~~││
│ └───────────┘│
└─────────────┘
```

### Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/ui/WaveLoader.tsx` | **Créer** — Composant avec logo + overlay vague animée via CSS |
| `src/index.css` | **Modifier** — Ajouter les keyframes `wave-rise` et `wave-move` |
| `src/components/offers/OffersLoading.tsx` | **Modifier** — Remplacer le spinner par `WaveLoader` |

### Détail du composant `WaveLoader`

- Accepte des props optionnelles : `size` (taille), `message` (texte sous le loader)
- Utilise `usePlatformSettings` pour récupérer le logo dynamiquement
- Structure :
  - Container centré avec fond semi-transparent
  - `div` relative contenant :
    - Image logo en `grayscale` + `opacity-30` (fond)
    - `div` absolute avec `overflow-hidden` + animation `wave-rise` (monte de `100%` à `0%` en ~2s)
    - À l'intérieur : image logo colorée (révélée progressivement)
    - Un SVG wave overlay qui ondule horizontalement en haut du remplissage
- Texte "Chargement..." en dessous

### Keyframes CSS

```css
@keyframes wave-rise {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0%); }
}

@keyframes wave-move {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

### Intégration dans `OffersLoading.tsx`

Remplacer le `Loader2` spinner par `<WaveLoader message="Chargement des demandes..." />`, en gardant le `PageTransition` et `Container` existants.

