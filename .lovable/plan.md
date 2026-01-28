
# Plan : Corriger la lisibilité des boutons "default"

## Probleme identifie

Le bouton "Retour a la demande" (variant `default`) est illisible car le texte blanc ne contraste pas suffisamment avec le fond bleu primaire. Ce probleme affecte tous les boutons utilisant `variant="default"`.

## Analyse Technique

### Configuration actuelle dans `button.tsx`
```tsx
default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
```

### Variables CSS dans `index.css`
```css
--primary: 228 76% 52%;           /* Bleu sature */
--primary-foreground: 0 0% 100%;  /* Blanc */
```

Le probleme peut venir de :
1. La saturation elevee du bleu (76%) qui peut creer des problemes de rendu
2. Le format HSL qui parfois n'est pas correctement interprete

## Solution

Remplacer les classes CSS dynamiques par des couleurs Tailwind explicites pour garantir un contraste optimal :

| Avant | Apres |
|-------|-------|
| `bg-primary text-primary-foreground` | `bg-blue-600 text-white` |

## Fichier a Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/ui/button.tsx` | Changer le variant `default` pour utiliser des couleurs explicites |

## Modification Detaillee

### button.tsx (ligne 13)

**Avant** :
```tsx
default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
```

**Apres** :
```tsx
default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
```

## Avantages

- Couleurs explicites = garantie de contraste
- `bg-blue-600` est un bleu standard avec excellent contraste sur texte blanc
- Coherence avec les autres variants (`success`, `warning`) qui utilisent deja des couleurs Tailwind explicites
- Correction globale pour TOUS les boutons `default` de l'application

## Impact

Cette modification affecte tous les boutons sans variant specifie ou avec `variant="default"` :
- Bouton "Retour a la demande" (ClientDetail.tsx)
- Bouton "Reessayer" (ClientDetail.tsx)
- Boutons dans SelfLeasingContractCard.tsx
- Bouton sur la page NotFound.tsx
- Et tous les autres boutons primaires de l'application

## Alternative (si necessaire)

Si vous preferez conserver les variables CSS, on peut aussi corriger le fichier `index.css` pour utiliser une teinte moins saturee :
```css
--primary: 221 83% 53%;  /* Equivalent de blue-600 */
```

Mais la solution avec les classes Tailwind explicites est plus fiable.
