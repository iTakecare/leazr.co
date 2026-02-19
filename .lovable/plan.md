
# Correction visuelle du trait barré sur les prix

## Probleme

Le `text-decoration: line-through` CSS positionne la ligne trop haut par rapport au texte. C'est un comportement connu des navigateurs : la position du trait depend des metriques du font et ne se centre pas visuellement sur les chiffres.

## Solution

Remplacer `text-decoration: line-through` par un trait manuel : un `span` positionne en `absolute` avec un trait (`height: 1px, background: currentColor`) centre verticalement a `top: 50%` dans un conteneur `position: relative; display: inline-block`.

Cela garantit que la ligne passe exactement au milieu du texte, independamment de la taille de police.

## Fichier modifie

`src/components/offers/CommercialOffer.tsx`

### Changements

#### 1. Creer un composant utilitaire inline `StrikePrice`

Un petit composant reutilisable qui affiche un prix avec un trait positionne manuellement au centre vertical :

```tsx
const StrikePrice = ({ children, style }) => (
  <span style={{ position: 'relative', display: 'inline-block', ...style }}>
    {children}
    <span style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: '1px',
      background: 'currentColor',
    }} />
  </span>
);
```

#### 2. Remplacer les 4 occurrences de `textDecoration: 'line-through'`

- **Prix unitaire original** (ligne ~518-527) : remplacer le `div` avec `textDecoration: 'line-through'` par `StrikePrice`
- **Prix total original par equipement** (ligne ~540-550) : idem
- **"Mensualite avant remise" dans le bloc remise** (ligne ~637-641) : idem
- **Bloc recapitulatif remise** (ligne ~671-675) : idem

Chaque occurrence suit le meme pattern : retirer `textDecoration: 'line-through'` du style et envelopper le contenu dans `StrikePrice`.

## Resultat attendu

Le trait passe exactement au milieu des chiffres (a 50% de la hauteur du texte), donnant un rendu visuel propre et correct sur tous les navigateurs.
