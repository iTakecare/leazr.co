

# Mise à jour du Webhook Secret GoCardless

## Contexte

Tu as fourni le JSON complet du webhook GoCardless qui contient le **vrai secret** :

```json
{
  "id": "WE000025D6A6HR",
  "name": "Leazr - iTakecare",
  "secret": "gc_webhook_leazr_itakecare_2026_Xk9mP4nQ7rW2vBc8"
}
```

Ce secret est celui que GoCardless utilise pour signer les requetes webhook. Il doit etre identique cote Supabase pour que la verification de signature fonctionne.

## Action a effectuer

### Etape 1 : Mettre a jour le secret Supabase

Remplacer la valeur de `GOCARDLESS_WEBHOOK_SECRET` par :

```
gc_webhook_leazr_itakecare_2026_Xk9mP4nQ7rW2vBc8
```

### Etape 2 : Redeployer la fonction webhook

Apres la mise a jour du secret, redeployer `gocardless-webhook` pour que le nouveau secret soit pris en compte.

### Etape 3 : Tester le webhook

Retourner dans GoCardless Dashboard :
1. **Developers** → **Webhooks** → Ouvrir le webhook `WE000025D6A6HR`
2. Cliquer sur **Retenter** pour renvoyer un evenement test
3. Le code de reponse devrait maintenant etre **200 OK**

## Verification

Les logs Supabase Edge Function devraient afficher :
- "Signature webhook validee avec succes"
- "Reception de X evenement(s) GoCardless"

## Probleme 403 restant

Rappel : apres avoir corrige le webhook (401), il restera le probleme 403 sur `gocardless-create-mandate`. Celui-ci necessite un **Personal Access Token (PAT)** valide avec les permissions `customers`, `mandates`, `billing_requests`. C'est une etape separee.

