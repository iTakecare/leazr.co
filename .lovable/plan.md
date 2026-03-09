

# Réduire les colonnes Type/Source et compacter la colonne Activité

## Modifications dans `src/components/offers/OffersTable.tsx`

### Headers (colonnes)
- **Type** : réduire `w-[100px]` → `w-[75px]`, police `text-[9px]`
- **Source** : réduire `w-[70px]` → `w-[60px]`, police `text-[9px]`
- **Activité** : réduire `w-[85px]` → `w-[95px]` pour laisser le texte sur une ligne, police `text-[9px]`

### Cellules (données)
- **Type** (ligne ~568-575) : réduire police `text-[11px]` → `text-[9px]`
- **Source** (ligne ~598-609) : réduire police `text-[11px]` → `text-[9px]`
- **Activité** (ligne ~532-543) : réduire police `text-[11px]` → `text-[9px]`, ajouter `whitespace-nowrap` pour forcer une seule ligne

Cela compacte les colonnes Type/Source pour laisser plus de place à la colonne Activité et éviter le retour à la ligne.

