

# Correction du trait barre dans le PDF - approche compatible html2canvas

## Probleme

Le `StrikePrice` actuel utilise `position: absolute` + `top: 50%` dans un `span` avec `display: inline-block`. Le moteur **html2canvas** (utilise pour generer le PDF) ne calcule pas correctement la hauteur des elements `inline-block`, ce qui fait que le trait se retrouve trop haut (~30% au lieu de 50%).

## Cause racine

html2canvas a des limitations connues avec les elements inline positiones en absolu. Le calcul de `top: 50%` depend de la hauteur du parent `inline-block`, et html2canvas ne la determine pas correctement.

## Solution

Remplacer l'approche `position: absolute` par une technique qui ne depend pas du positionnement absolu et qui est fiable avec html2canvas : utiliser des elements **block-level** (`div` au lieu de `span`) et un trait dessine via un `div` absolu dans un conteneur `div` avec `position: relative`.

Le composant `StrikePrice` sera modifie :

```tsx
const StrikePrice = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: 'relative', display: 'inline-block', ...style }}>
    <div style={{ visibility: 'visible' }}>{children}</div>
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        height: '1.5px',
        backgroundColor: '#6B7280',
      }} />
    </div>
  </div>
);
```

### Pourquoi cette approche fonctionne

Au lieu de calculer `top: 50%` (ce que html2canvas gere mal sur les inline), on utilise :
- Un overlay `div` en `position: absolute` qui couvre tout le parent (`top: 0, bottom: 0, left: 0, right: 0`)
- Un `display: flex` + `alignItems: center` pour centrer le trait verticalement
- html2canvas gere bien `flexbox` et les elements `div` en block

### Fallback si flexbox pose aussi probleme

Si flex ne marche pas non plus dans html2canvas, une alternative ultime serait d'utiliser `border-bottom` sur un element qui fait exactement 50% de la hauteur du parent :

```tsx
<div style={{
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: '50%',
  borderBottom: '1.5px solid #6B7280',
}} />
```

Cette methode est la plus simple et la plus fiable car `height: 50%` + `border-bottom` est un pattern CSS basique que tous les moteurs de rendu gerent correctement.

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/CommercialOffer.tsx` | Modifier le composant `StrikePrice` (lignes 173-185) pour utiliser l'approche `height: 50%` + `border-bottom` |

## Resultat attendu

Le trait passe exactement au milieu des chiffres dans le PDF genere, car on utilise un pattern CSS basique (`height: 50%` + `border-bottom`) que html2canvas interprete correctement.

