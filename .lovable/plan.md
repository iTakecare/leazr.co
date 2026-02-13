
# Correction de l'erreur de creation de fournisseur

## Probleme identifie

La fonction `createSupplier` dans `src/services/supplierService.ts` (ligne 77-80) fait une requete sur la table `profiles` sans filtre sur l'utilisateur connecte :

```sql
SELECT company_id FROM profiles -- sans WHERE !
```

Cela retourne plusieurs lignes (tous les profils), et `.single()` echoue car il attend exactement une ligne. D'ou l'erreur "User company not found".

## Correction

Modifier la fonction `createSupplier` pour recuperer d'abord l'utilisateur connecte via `supabase.auth.getUser()`, puis filtrer la requete profiles par son `user_id`.

### Fichier concerne

| Fichier | Modification |
|---------|-------------|
| `src/services/supplierService.ts` | Ajouter `auth.getUser()` et filtrer `.eq('id', user.id)` dans `createSupplier` |

### Code modifie (lignes 75-84)

```typescript
export async function createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    throw new Error('User company not found');
  }
  // ... reste inchange
}
```

Aucun autre fichier n'est modifie.
