

# Fix: Inclure les uploads de documents dans le calcul de la dernière activité

## Diagnostic
Le calcul de `last_activity_at` dans `getOffers.ts` (ligne 133-138) ne prend en compte que `updated_at` et les `offer_workflow_logs`. Les uploads de documents (`offer_documents.uploaded_at`) sont ignorés, alors qu'ils représentent une activité réelle du client.

Les documents récents sont déjà récupérés (ligne 91-96) mais uniquement utilisés pour `has_recent_documents`, pas pour `last_activity_at`.

## Solution
Dans `src/services/offers/getOffers.ts`, modifier le calcul de `last_activity_at` (lignes 133-138) pour inclure aussi le timestamp du dernier document uploadé pour chaque offre.

1. Après la boucle des workflow logs (ligne 122), ajouter une `Map` similaire pour les documents récents -- mais en récupérant **tous** les documents (pas seulement les 24h) pour le calcul d'activité. Alternativement, utiliser les `recentDocuments` déjà récupérés comme approximation, puis aussi récupérer le dernier document par offre.

2. Récupérer les derniers documents par offre (requête supplémentaire) :
```typescript
const { data: latestDocs } = await supabase
  .from('offer_documents')
  .select('offer_id, uploaded_at')
  .in('offer_id', offerIds)
  .order('uploaded_at', { ascending: false });

const latestDocByOffer = new Map<string, string>();
if (latestDocs) {
  for (const doc of latestDocs) {
    if (!latestDocByOffer.has(doc.offer_id)) {
      latestDocByOffer.set(doc.offer_id, doc.uploaded_at);
    }
  }
}
```

3. Modifier le calcul ligne 133-138 :
```typescript
const lastDocTime = latestDocByOffer.has(offer.id)
  ? new Date(latestDocByOffer.get(offer.id)!).getTime()
  : 0;
const lastActivityAt = new Date(Math.max(updatedAtTime, lastLogTime, lastDocTime)).toISOString();
```

Seul fichier modifié : `src/services/offers/getOffers.ts`.

