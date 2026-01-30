

# Plan de correction GoCardless - Webhook et Token

## Diagnostic

### Probleme 1 : Format de signature webhook incorrect

Le code actuel dans `gocardless-webhook/index.ts` attend un format Stripe-like :
```
t=timestamp,s0=signature,s1=signature...
```

Mais GoCardless envoie simplement :
```
Webhook-Signature: c6c361a11d7802042df31f7b27f2a44cea7a68eed3c429ed8c579aa9db3a6d70
```

C'est un hash HMAC-SHA256 direct du body, sans timestamp.

### Probleme 2 : Secret webhook manquant

Le secret `GOCARDLESS_WEBHOOK_SECRET` n'existe pas dans Supabase. Il doit etre recupere depuis le dashboard GoCardless et ajoute.

### Probleme 3 : Token d'acces bloque

Le token "Leazr" compromis n'a pas ete revoque. GoCardless l'a probablement desactive automatiquement (erreur 403).

---

## Corrections techniques

### Modification de l'edge function `gocardless-webhook/index.ts`

La fonction `verifyWebhookSignature` doit etre reecrite pour utiliser le format GoCardless :

```typescript
// AVANT (format Stripe incorrect)
const parts = signature.split(',');
const timestamp = signatureMap['t'];
const signaturePayload = `${timestamp}.${body}`;

// APRES (format GoCardless correct)
// La signature est un simple HMAC-SHA256 du body
const expectedSignature = HMAC-SHA256(body, secret);
return signature === expectedSignature;
```

### Ajout du secret webhook

Recuperer le secret depuis GoCardless Dashboard :
1. Developers → Webhooks
2. Cliquer sur le webhook existant
3. Copier le "Webhook endpoint secret"

### Nouveau token d'acces

1. Revoquer le token "Leazr" compromis
2. Creer un nouveau Personal Access Token avec toutes les permissions
3. Mettre a jour `GOCARDLESS_ACCESS_TOKEN` dans Supabase

---

## Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/gocardless-webhook/index.ts` | Reecrire `verifyWebhookSignature()` pour le format GoCardless |

## Secrets a configurer

| Secret | Action |
|--------|--------|
| `GOCARDLESS_ACCESS_TOKEN` | Mettre a jour avec nouveau token Live |
| `GOCARDLESS_WEBHOOK_SECRET` | Creer avec le secret du webhook |

---

## Nouvelle implementation de la verification de signature

```typescript
async function verifyWebhookSignature(
  body: string, 
  signature: string, 
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Importer la cle secrete
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculer le HMAC-SHA256 du body directement
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    // Convertir en hex
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Comparaison directe
    return signature === expectedSignature;
  } catch (error) {
    console.error('Erreur verification signature:', error);
    return false;
  }
}
```

---

## Actions utilisateur requises

### Dans GoCardless Dashboard (Live)

1. **Developers → Personal access tokens**
   - Revoquer le token "Leazr"
   - Creer un nouveau token "Leazr-Prod-2026" avec toutes les permissions
   - Copier la valeur

2. **Developers → Webhooks**
   - Cliquer sur le webhook configure
   - Copier le "Webhook endpoint secret"

### Dans Lovable

Fournir les deux valeurs pour que je puisse :
1. Mettre a jour `GOCARDLESS_ACCESS_TOKEN`
2. Creer `GOCARDLESS_WEBHOOK_SECRET`
3. Corriger le code de verification de signature

---

## Resultat attendu

- Les webhooks GoCardless seront valides (plus de 401)
- La creation de mandat fonctionnera (plus de 403)
- Les statuts de mandat seront synchronises automatiquement

