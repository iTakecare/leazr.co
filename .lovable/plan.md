
# Fix: Recherche client qui ne trouve rien

## Probleme

Le composant `Command` (cmdk) applique son propre **filtre client-side** en plus du filtre serveur Supabase. Quand vous tapez "Ke", Supabase retourne bien les Kevin, mais cmdk les filtre a nouveau localement avec son propre algorithme et ne les trouve pas.

## Solution

Un seul changement dans `src/components/tasks/ClientSearchInput.tsx` :

1. **Ajouter `shouldFilter={false}`** sur le composant `<Command>` pour desactiver le filtrage interne de cmdk (puisque le filtrage est deja fait cote serveur par Supabase)
2. **Ajouter un debounce de 300ms** sur la recherche pour eviter les appels API excessifs a chaque frappe
3. **Ajouter `value={c.id}`** sur chaque `CommandItem` pour eviter les conflits de matching interne

## Detail technique

```
// Ligne 111 - Avant :
<Command>

// Apres :
<Command shouldFilter={false}>
```

C'est le correctif principal. Le `shouldFilter={false}` dit a cmdk : "ne filtre pas toi-meme, je gere le filtrage via l'API".

En complement :
- Debounce de 300ms via `setTimeout` + cleanup dans le `useEffect`
- Remplacement de `.single()` par `.maybeSingle()` pour la resolution du nom
- Ajout de `value={c.id}` sur les `CommandItem`

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/tasks/ClientSearchInput.tsx` | Ajout `shouldFilter={false}`, debounce 300ms, `.maybeSingle()` |
