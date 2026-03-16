

# Rendre l'icône du step actif visible et plus fun dans le MiniWorkflowStepper

## Problème
Sur le dashboard et la page des demandes, l'icône du step en cours (cercle bleu `bg-primary` avec `CircleDot` blanc) est quasi invisible à cette petite taille (20x20px). Le `animate-pulse` la rend encore moins lisible en la faisant disparaître par moments.

## Solution
Remplacer le style du step actif par un design plus visible et ludique :

### `src/components/client/MiniWorkflowStepper.tsx`
- **Step actif (desktop)** : Remplacer le cercle bleu pulsant par un cercle avec un anneau lumineux (`ring-4 ring-primary/20`), un fond dégradé (`bg-gradient-to-br from-blue-500 to-indigo-600`), une ombre colorée (`shadow-md shadow-primary/30`), et une icône `Loader2` avec rotation CSS (`animate-spin`) pour donner un aspect dynamique "en cours de traitement"
- **Step actif (mobile)** : Ajouter un petit indicateur animé (point pulsant) à côté du label du step actif
- Supprimer `animate-pulse` qui cause l'invisibilité
- Augmenter légèrement la taille du cercle actif (`h-6 w-6`) pour le distinguer des autres (`h-5 w-5`)

