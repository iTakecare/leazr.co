

# Fix: Erreur "User not authenticated" lors de la creation de fournisseur

## Probleme identifie

`supabase.auth.getUser()` retourne `null` dans `createSupplier`. Cette methode fait un appel reseau au serveur Supabase pour valider le token, et peut echouer si le token est expire ou si la requete echoue silencieusement.

## Solution

Utiliser `supabase.auth.getSession()` a la place, qui lit le token depuis le cache local (plus fiable cote client), puis extraire le `user` de la session.

### Fichier concerne

| Fichier | Modification |
|---------|-------------|
| `src/services/supplierService.ts` | Remplacer `getUser()` par `getSession()` dans `createSupplier` |

### Code modifie (lignes 75-77)

Avant :
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('User not authenticated');
```

Apres :
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) throw new Error('User not authenticated');
const user = session.user;
```

Le reste de la fonction reste identique (la variable `user` est toujours utilisee de la meme maniere apres).

Aucun autre fichier n'est modifie.
