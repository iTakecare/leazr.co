
# Création d'une Edge Function proxy pour Zapier

## Problème actuel

Le navigateur ne peut pas confirmer que la requête vers Zapier a abouti car :
1. Zapier ne supporte pas CORS correctement
2. Le mode `no-cors` empêche de lire la réponse
3. Certains navigateurs (Safari) lèvent une erreur "Load failed" même si la requête part

## Solution

Créer une **Edge Function `zapier-proxy`** qui :
1. Reçoit les requêtes du frontend
2. Envoie les données à Zapier côté serveur (pas de problème CORS)
3. Retourne un vrai statut de succès/échec au frontend

## Architecture

```text
┌──────────────┐        ┌─────────────────────┐        ┌────────────────┐
│   Frontend   │ ──────▶│  Edge Function      │ ──────▶│    Zapier      │
│  (Browser)   │        │  zapier-proxy       │        │   Webhook      │
└──────────────┘        └─────────────────────┘        └────────────────┘
                               │                               │
                               ▼                               ▼
                        Vraie réponse              Vraie confirmation
                        HTTP 200/4xx/5xx           que Zapier a reçu
```

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/zapier-proxy/index.ts` | Créer | Edge Function proxy |
| `supabase/config.toml` | Modifier | Ajouter config pour `zapier-proxy` |
| `src/utils/zapier.ts` | Modifier | Utiliser la Edge Function au lieu de fetch direct |
| `src/components/settings/ZapierIntegrationCard.tsx` | Modifier | Utiliser la nouvelle fonction pour le test |

## Edge Function `zapier-proxy`

Cette fonction acceptera :
- `action`: `"test"` ou `"trigger"`
- `webhook_url`: URL du webhook Zapier
- `payload`: Données à envoyer

Elle fera un vrai `fetch` vers Zapier et retournera :
- `success: true/false`
- `status`: Code HTTP de Zapier (200, 4xx, 5xx)
- `message`: Message pour l'utilisateur

## Avantages

1. **Vraie confirmation** : On saura si Zapier a reçu la requête
2. **Pas de problème CORS** : Le serveur n'a pas ces restrictions
3. **Meilleurs logs** : On peut logger les erreurs côté serveur
4. **Compatible tous navigateurs** : Fonctionne sur Safari, Chrome, Firefox...
5. **Traçabilité** : Les requêtes passent par notre infrastructure

## Sécurité

- Authentification requise (l'utilisateur doit être connecté)
- Validation de l'URL (doit être un webhook Zapier valide)
- Vérification que l'utilisateur appartient à la company concernée

## Modifications du code frontend

### `src/utils/zapier.ts`

Remplacer les appels `fetch` directs par des appels à la Edge Function :

```typescript
export async function triggerZapierWebhook(
  companyId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<boolean> {
  // Appeler la Edge Function au lieu de fetch direct
  const { data: result, error } = await supabase.functions.invoke('zapier-proxy', {
    body: {
      action: 'trigger',
      company_id: companyId,
      event_type: eventType,
      payload: data,
    },
  });

  if (error) {
    console.error('[Zapier] Error:', error);
    return false;
  }

  return result?.success === true;
}
```

### `ZapierIntegrationCard.tsx`

Le bouton "Tester" appellera aussi la Edge Function et pourra afficher un vrai message de succès ou d'erreur.

## Résultat attendu

1. Le bouton "Tester le webhook" affichera :
   - ✅ "Succès ! Zapier a bien reçu la requête." (si HTTP 200)
   - ❌ "Erreur : Zapier a répondu avec le code XXX" (si erreur)
   - ❌ "Impossible de contacter Zapier. Vérifiez l'URL." (si timeout/erreur réseau)

2. Les déclenchements en production (contrat signé, etc.) passeront aussi par le proxy et seront plus fiables.
