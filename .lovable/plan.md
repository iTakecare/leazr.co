

## Diagnostic : `getPartners is not defined`

### Cause identifiée

L'erreur est un **`ReferenceError: getPartners is not defined`** dans les logs de l'edge function `catalog-api`. Cela signifie que la version **déployée** de la fonction ne contient pas les fonctions partenaires (`getPartners`, `getPartner`, `getPartnerPacks`, `getPartnerProviders`, `getProviderProducts`) qui ont été ajoutées au code source.

Le code source (`supabase/functions/catalog-api/index.ts`) est correct : les fonctions sont bien définies (lignes 1241-1561), le routage est en place (lignes 286-303). Le problème est uniquement un **décalage entre le code et le déploiement**.

### Données en base

Le partenaire "PodBW" (slug: `pod`) existe bien en base avec `is_active = true`. L'API devrait le retourner une fois redéployée.

### Plan

**1. Redéployer l'edge function `catalog-api`**
- Aucune modification de code nécessaire
- Le simple redéploiement synchronisera le code source avec la version en production
- Cela rendra fonctionnels tous les endpoints : `GET partners`, `GET partners/{slug}`, `GET partners/{slug}/packs`, `GET partners/{slug}/providers`, `GET providers`, `GET providers/{id}/products`

