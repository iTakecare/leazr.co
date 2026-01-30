
Objectif
- Corriger définitivement le 401 “Signature invalide” reçu par GoCardless sur l’URL webhook Supabase.
- Te guider pour retrouver (ou régénérer) le bon secret côté GoCardless et le mettre au bon endroit côté Supabase.
- Rendre la vérification de signature plus robuste (trim/casse/bytes bruts/comparaison sûre) + logs utiles.

Constat (à partir de tes captures + payload)
- GoCardless appelle bien : https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook
- Le header est : Webhook-signature: c6c3…6d70 (hex 64 chars, donc SHA-256)
- Notre fonction répond 401 avec {"error":"Signature invalide"}
- Le payload test est un événement “creditors.updated” (non géré dans le switch), mais ça ne devrait pas empêcher un 200 : même si “non géré”, on renvoie 200 tant que la signature est valide.

Hypothèses racines probables
1) Mauvais secret utilisé dans SUPABASE (le plus fréquent)
   - GoCardless a plusieurs “secrets” dans l’interface (Partner App / OAuth / Webhook endpoint).
   - Le webhook se vérifie avec le secret du “point de terminaison webhook” (Webhook endpoint secret), pas le Client Secret OAuth.
   - Si tu ne “vois pas” le secret aujourd’hui, il est probable qu’il n’est visible qu’à la création, ou bien qu’il faut le “Rotate/Regenerate”.

2) Secret copié avec un espace / retour ligne
   - Très courant : un espace avant/après, ou une fin de ligne copiée.
   - Le code actuel ne fait pas .trim().

3) Mismatch “bytes bruts”
   - GoCardless signe le corps brut (bytes). On utilise req.text() puis on ré-encode.
   - En UTF-8 “propre”, ça colle normalement, mais pour éliminer tout doute, on peut hasher directement sur l’ArrayBuffer brut reçu.

Ce que je vais proposer de faire (approche)
A) Côté GoCardless : retrouver ou régénérer le “Webhook endpoint secret”
B) Côté Supabase : mettre à jour GOCARDLESS_WEBHOOK_SECRET de façon sûre
C) Côté code : durcir verifyWebhookSignature pour éviter les cas limites + logs clairs
D) Tester : “Retenter” dans GoCardless + vérifier logs Supabase

Étapes détaillées

1) Retrouver / régénérer le bon secret dans GoCardless (Live)
Tu es déjà au bon endroit (Développeurs > Paramètres de l’API), mais tu ne vois pas le secret.
On va donc chercher la page “détails du point de terminaison” :

Sur Desktop (comme tes captures)
1. Dans GoCardless, menu gauche : Développeurs → Paramètres de l’API
2. Dans la section “Points de terminaison de webhook”, clique sur la ligne/nom “Leazr - iTakecare”
   - Selon l’UI, c’est parfois un lien, parfois il faut cliquer sur un menu “…” à droite.
3. Sur la page de détail, cherche un champ “Webhook endpoint secret” / “Secret”
   - S’il est masqué : bouton “Reveal” / “Afficher”
   - Si rien n’apparaît : cherche un bouton “Rotate secret / Regenerate secret / Generate new secret”
4. Si tu dois régénérer :
   - Regenerate/Rotate → copie immédiatement le nouveau secret (souvent affiché une seule fois)

Sur Mobile (si tu testes depuis téléphone)
- Même logique : Développeurs → Paramètres de l’API → “Points de terminaison de webhook” → ouvrir “Leazr - iTakecare”
- Si le clic ne marche pas sur mobile, fais-le sur desktop (plus fiable pour l’admin GoCardless).

Si GoCardless ne te donne jamais accès au secret
- Alors la seule solution est généralement “Rotate/Regenerate secret”.
- Si même ça n’existe pas, il est possible que ton compte GoCardless soit en mode “verification in progress” (bannière en haut) et limite certaines infos : dans ce cas, on peut créer un NOUVEL endpoint webhook (nouvelle entrée) et récupérer le secret lors de la création.

2) Mettre à jour le secret dans Supabase (je te guide pas à pas)
Deux façons possibles (on fera la plus simple au moment d’implémenter) :

Option A (recommandée) : via Lovable (modal sécurisé)
- Je déclenche une demande de mise à jour de secret “GOCARDLESS_WEBHOOK_SECRET”
- Tu colles le secret dans la fenêtre Lovable (il n’est pas affiché publiquement)
- Lovable le stocke côté Supabase Secrets

Option B : via dashboard Supabase
- Ouvre : https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/settings/functions
- Cherche “GOCARDLESS_WEBHOOK_SECRET”
- Remplace la valeur par le secret GoCardless (sans espaces/retours ligne)
- Sauvegarde

Important
- Le secret doit être collé “exactement” : pas d’espace avant/après, pas de guillemets.

3) Ajuster le code du webhook pour être robuste (changements ciblés uniquement)
Fichier concerné uniquement : supabase/functions/gocardless-webhook/index.ts

3.1 Lecture du body en bytes bruts
- Remplacer `const body = await req.text();` par une lecture en ArrayBuffer (raw bytes).
- Garder une version string via TextDecoder pour JSON.parse.
Bénéfice : élimine tout doute sur l’encodage / normalisation.

3.2 Normalisation des entrées
- `const signature = (header ?? '').trim().toLowerCase()`
- `const secret = (webhookSecret ?? '').trim()`
Bénéfice : évite erreurs dues aux espaces / casse hex.

3.3 Comparaison “safe” et diagnostics sans fuite
- Au lieu d’une comparaison directe string === string, utiliser une comparaison constant-time (ou équivalent) sur bytes
- Logs en cas d’échec :
  - longueur du body
  - les 8–12 premiers chars de signature attendue/reçue (pas toute la valeur, pour éviter de trop exposer)
  - s’assurer de NE PAS logger le secret

3.4 Comportement si secret manquant
- Aujourd’hui : si secret ou signature absents, on skip la vérification.
- Proposition : si `GOCARDLESS_WEBHOOK_SECRET` est absent, répondre 500 “Webhook secret not configured” (c’est une vraie erreur de config).
- Ça évite de “croire” que tout marche alors que ce n’est pas sécurisé.

4) Vérification / Test end-to-end
4.1 Logs Supabase (où regarder)
- Edge Function logs : https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/functions/gocardless-webhook/logs
Tu pourras y voir :
- soit “Signature webhook invalide” + mini diagnostics (si ça échoue encore)
- soit “Réception de X événement(s) GoCardless” (si OK)

4.2 Re-test GoCardless
- Dans GoCardless → Webhooks → ouvrir WB01KG4H5P4JAB → “Retenter”
Attendu :
- Code de réponse 200
- “Test” devient vrai

4.3 Résultat fonctionnel attendu
- Même si l’événement est “creditors.updated”, on doit répondre 200 (et juste logguer “Type d’événement non géré: creditors”).
- Les mises à jour DB (contracts) ne se font que pour mandates/payments/subscriptions (c’est normal).

Points de vigilance
- Le problème actuel est quasi-certainement le secret (pas l’algo). Les changements code (trim/raw bytes) servent à éliminer les causes “subtiles” et à rendre le debug beaucoup plus simple.
- Je ne modifierai aucun autre composant UI que celui concerné si on doit afficher quelque chose (mais ici, la correction est uniquement côté edge function + secrets).

Ce que j’aurai besoin de toi pendant l’implémentation (très concret)
- Soit tu me donnes le “Webhook endpoint secret” (le bon, celui du point de terminaison webhook),
- Soit tu le colles directement dans la fenêtre de mise à jour de secret Lovable quand je la déclencherai.

Livrables
- Code edge function gocardless-webhook durci (raw bytes + trim + comparaison safe + logs)
- Secret Supabase GOCARDLESS_WEBHOOK_SECRET mis à jour avec le bon “Webhook endpoint secret”
- Procédure de test confirmée (GoCardless retry + logs Supabase)
