

## Problème identifié

La Edge Function `create-product-request` fait **1208 lignes** avec d'énormes templates HTML d'email inlinés. Cela provoque des erreurs de **"Bundle generation timed out"** lors du déploiement. Résultat : la version déployée est une **ancienne version** qui ne contient pas le code d'insertion des services externes ni le type `partner_request`.

Le code est correct — c'est le déploiement qui échoue.

## Solution

Extraire les templates HTML d'email dans un fichier `_shared/emailTemplates.ts` pour réduire drastiquement la taille du fichier principal. Cela permettra au bundler de générer le code sans timeout.

### Fichiers à créer/modifier

1. **Créer `supabase/functions/_shared/emailTemplates.ts`** (~300 lignes)
   - Exporter `generateClientConfirmationEmail(params)` — template HTML de confirmation client
   - Exporter `generateClientAccountEmail(params)` — template HTML avec lien de mot de passe
   - Exporter `generateAdminNotificationEmail(params)` — template HTML de notification admin
   - Exporter `stripHtml(html)` — utilitaire de nettoyage HTML

2. **Modifier `supabase/functions/create-product-request/index.ts`**
   - Importer les 3 fonctions de template depuis `../_shared/emailTemplates.ts`
   - Remplacer les templates HTML inlinés (lignes 734-766, 810-848, 992-1070) par des appels aux fonctions importées
   - Supprimer la fonction `stripHtml` locale (ligne 1206-1208)
   - Objectif : passer de ~1208 lignes à ~700 lignes

### Aucun changement de logique

La logique métier (insertion services externes, type partner_request, calcul des prix DB Leazr) reste identique. Seule la structure du fichier change pour permettre le déploiement.

