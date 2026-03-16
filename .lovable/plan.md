

## Problème

La fonction RPC `get_public_packs` retourne **tous** les packs actifs non-admin, y compris ceux assignés à des partenaires (Solinfis, The Pod, Le Placard, Federia). Ces packs exclusifs apparaissent donc dans le catalogue client alors qu'ils ne devraient être visibles que sur les pages partenaires dédiées.

Sur 13 packs actifs, **10 sont des packs partenaires** qui polluent le catalogue client.

## Solution

Modifier la fonction RPC `get_public_packs` pour exclure les packs qui ont une entrée dans la table `partner_packs`.

### Migration SQL

Recréer la fonction `get_public_packs` avec un filtre additionnel :

```sql
AND NOT EXISTS (
  SELECT 1 FROM public.partner_packs ppk 
  WHERE ppk.pack_id = pp.id
)
```

Cela garantit que :
- Les packs partenaires restent accessibles via l'API partenaire (`partners/{slug}/packs`)
- Le catalogue client/public ne montre que les packs génériques
- Aucun changement côté frontend nécessaire

### Fichier impacté

| Fichier | Action |
|---|---|
| Migration SQL | Recréer `get_public_packs` avec exclusion `partner_packs` |

Un seul changement, côté base de données uniquement.

