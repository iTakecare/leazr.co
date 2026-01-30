

# Plan de correction finale - GoCardless Webhook Signature

## Diagnostic confirme

J'ai analyse le code source officiel de GoCardless Node.js (https://github.com/gocardless/gocardless-nodejs/blob/master/src/webhooks.ts) et confirme que :

1. La signature est un HMAC-SHA256 du body brut
2. Le secret utilise est le "Webhook endpoint secret" (pas le OAuth secret)
3. La signature est comparee en hex

## Probleme identifie

Tu as probablement utilise le mauvais secret. Dans GoCardless, il y a **deux types de secrets** :

| Type | Ou le trouver | Usage |
|------|---------------|-------|
| **OAuth Client Secret** | Partners > App > Client Secret | Authentification OAuth (pas pour webhooks) |
| **Webhook Endpoint Secret** | Developers > Webhooks > (ton endpoint) > Secret | **Verification des signatures webhook** |

Tu dois utiliser le **Webhook Endpoint Secret** pour `GOCARDLESS_WEBHOOK_SECRET`.

---

## Actions requises

### Etape 1 : Recuperer le bon secret

1. Va dans GoCardless Dashboard (Live) : https://manage.gocardless.com
2. Clique sur **Developers** dans le menu
3. Clique sur **Webhooks** (pas sur Partners)
4. Clique sur ton webhook endpoint (celui qui pointe vers `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/gocardless-webhook`)
5. Tu verras un **"Webhook endpoint secret"** - copie cette valeur

### Etape 2 : Mettre a jour le secret dans Supabase

Une fois que tu as le bon secret, fournis-le moi et je mettrai a jour `GOCARDLESS_WEBHOOK_SECRET`.

---

## Verification du code

Le code actuel dans `gocardless-webhook/index.ts` est **deja correct** :

```typescript
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}
```

Cette implementation est equivalente a la version officielle :
```javascript
// Version officielle Node.js
crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')
```

---

## Resume

| Element | Statut |
|---------|--------|
| Algorithme de signature | Correct (HMAC-SHA256 hex) |
| Format du body | Correct (raw body direct) |
| Secret utilise | A VERIFIER - doit etre le "Webhook endpoint secret" |

---

## Prochaine action

Fournis-moi le **Webhook endpoint secret** depuis GoCardless Dashboard > Developers > Webhooks > (ton endpoint) > Secret, et je mettrai a jour le secret Supabase.

