
# Plan : Correction des textes blancs illisibles dans la modale de scoring

## Problème identifié

Dans la modale "Analyse Leaser", certains éléments ont du texte blanc sur un fond clair, les rendant invisibles :

1. **Boutons secondaires avec spinner de chargement** : Le spinner utilise `border-white` mais le fond du bouton secondaire est clair (`bg-secondary`)
2. **Bouton principal à l'état désactivé** : L'opacité réduite (`opacity-50`) peut rendre le texte blanc moins lisible

## Fichier à modifier

**`src/components/offers/detail/ScoringModal.tsx`**

## Modifications détaillées

### 1. Corriger les spinners de chargement dans les boutons secondaires

Les boutons secondaires (lignes 756-773, 798-815) utilisent `border-white` pour le spinner mais ont un fond clair. Changer pour `border-current` qui utilisera la couleur du texte actuel.

| Lignes | Avant | Après |
|--------|-------|-------|
| 765 | `border-t-2 border-b-2 border-white` | `border-t-2 border-b-2 border-current` |
| 807 | `border-t-2 border-b-2 border-white` | `border-t-2 border-b-2 border-current` |

### 2. Ajouter une variante appropriée aux boutons de validation selon le score

Pour améliorer la lisibilité et la cohérence visuelle, utiliser `variant="success"` pour le score A (déjà défini dans button.tsx avec `text-white`).

| Lignes | Score | Modification |
|--------|-------|--------------|
| 737 | B | Ajouter `className="bg-amber-600 text-white hover:bg-amber-700"` |
| 779 | C | Ajouter `variant="destructive"` |
| 819 | A | Ajouter `variant="success"` |

## Récapitulatif des changements

```tsx
// Ligne 737 - Bouton Score B (email)
<Button 
  onClick={handleSubmit}
  disabled={isLoading || isSending}
  size="lg"
  className="bg-amber-600 text-white hover:bg-amber-700"
>

// Ligne 765 - Spinner dans bouton secondaire B
border-t-2 border-b-2 border-current  // Avant: border-white

// Ligne 779 - Bouton Score C (email)
<Button 
  onClick={handleSendRejectionAndValidate}
  disabled={isLoading || isSending}
  size="lg"
  variant="destructive"
>

// Ligne 807 - Spinner dans bouton secondaire C
border-t-2 border-b-2 border-current  // Avant: border-white

// Ligne 819 - Bouton Score A
<Button 
  onClick={handleSubmit}
  disabled={isLoading || isSending}
  size="lg"
  variant="success"
>

// Ligne 827 - Spinner dans bouton Score A
border-t-2 border-b-2 border-current  // Avant: border-white
```

## Résultat attendu

- **Score A** : Bouton vert émeraude avec texte blanc visible
- **Score B** : Bouton ambre/orange avec texte blanc visible
- **Score C** : Bouton rouge avec texte blanc visible
- **Boutons secondaires** : Spinner avec couleur adaptée au fond clair
- Tous les textes seront lisibles sur tous les fonds de boutons
