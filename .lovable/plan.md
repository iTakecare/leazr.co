
Problème identifié avec certitude: l’envoi échoue avant insertion DB, dans l’Edge Function `create-product-request`, à cause de la validation Zod. Le payload envoie `products[].variant_id = null`, alors que le schéma accepte `string` ou `undefined` (pas `null`). C’est exactement l’erreur visible dans les logs Edge (`Expected string, received null`).

Plan de correction

1) Corriger la construction du payload côté frontend
- Fichier: `src/services/requestInfoService.ts`
- Dans `createProductRequest`, ne plus envoyer `variant_id: null`.
- Construire `variant_id` de façon sûre:
  - priorité à une vraie valeur si disponible (`selectedOptions.variant_id`, `selectedOptions.selected_variant_id`, `product.selected_variant_id`, etc.),
  - sinon **ne pas inclure la clé** `variant_id` dans l’objet produit.
- Objectif: rendre le payload conforme au schéma Zod actuel.

2) Rendre la validation backend rétrocompatible (anti-régression)
- Fichier: `supabase/functions/_shared/validationSchemas.ts`
- Adapter `variant_id` dans `productItemSchema` (et `customPackItemSchema`) pour tolérer temporairement `null` (ex: nullable + normalisation vers `undefined`).
- But: éviter qu’un ancien client/front casse encore la fonction même si `null` est envoyé.

3) Améliorer le message d’erreur côté UI
- Fichier: `src/services/requestInfoService.ts`
- Quand `supabase.functions.invoke` retourne une erreur HTTP, tenter d’extraire les `details` de validation renvoyés par l’Edge Function pour afficher un toast explicite (au lieu du message générique “non-2xx”).
- But: diagnostic immédiat si une autre clé est invalide.

Validation après implémentation

- Test E2E du parcours exact vu dans la capture: `/itakecare/client/products` → panier inline → étapes Entreprise/Contact/Récapitulatif → “Envoyer ma demande”.
- Vérifier:
  - plus de toast d’échec,
  - création de la demande (offer + équipements),
  - absence d’erreur Zod dans logs `create-product-request`.
- Retester aussi le flux public de demande pour confirmer qu’il n’y a pas de régression.

Détails techniques (résumé)
- Cause racine: mismatch strict de type (`null` vs `string|undefined`) sur `variant_id`.
- Aucune migration SQL/RLS nécessaire pour ce bug précis.
- Le correctif doit cibler le vrai flux utilisé ici (`RequestSummary` → `createProductRequest`), pas `createClientRequest`.
