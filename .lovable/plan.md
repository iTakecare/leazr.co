

# Ajout d'une colonne "Dernière activité" triable dans la table des demandes

## Approche

Utiliser le champ `updated_at` de la table `offers` comme source principale pour la dernière activité. Ce champ est déjà mis à jour à chaque modification d'offre. Pour enrichir, on prend aussi la date la plus récente entre `updated_at` et le dernier `offer_workflow_logs.created_at`.

## Modifications

### 1. `src/services/offers/getOffers.ts`
- Dans la requête principale, ajouter une sous-requête pour récupérer la date du dernier workflow log par offre
- Calculer `last_activity_at` = `GREATEST(updated_at, dernier workflow log)` côté JS après la requête
- Alternative plus simple : récupérer les derniers workflow logs en batch (comme c'est déjà fait pour `offer_documents`), puis enrichir chaque offre

### 2. `src/components/offers/OffersTable.tsx`
- Ajouter `'last_activity'` au type `OfferSortColumn`
- Ajouter une nouvelle `SortableTableHead` "Dernière activité" après la colonne "Date offre"
- Afficher la date en format relatif (il y a 5 min, hier, il y a 3 jours) avec `formatDistanceToNow` de date-fns
- Ajouter le cas de tri dans le `sortedOffers` useMemo
- **Tri par défaut** : garder `date` comme tri par défaut (l'utilisateur peut cliquer sur la colonne "Dernière activité" pour trier)

### Détail technique

Dans `getOffers.ts`, après avoir récupéré les offres, on fait une requête batch :
```typescript
const { data: latestLogs } = await supabase
  .from('offer_workflow_logs')
  .select('offer_id, created_at')
  .in('offer_id', data.map(o => o.id))
  .order('created_at', { ascending: false });
```
Puis on calcule par offre la date la plus récente entre `updated_at` et le dernier log.

Dans `OffersTable.tsx`, affichage avec `formatDistanceToNow` :
```tsx
<TableCell className="text-[10px]">
  {formatDistanceToNow(new Date(offer.last_activity_at), { addSuffix: true, locale: fr })}
</TableCell>
```

