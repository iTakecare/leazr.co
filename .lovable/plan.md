
# Plan : Ajouter le Reply-To avec l'email de l'utilisateur connecte

## Probleme

Quand un client recoit une offre par email et clique "Repondre", la reponse va a `noreply@itakecare.be` au lieu de l'adresse de l'utilisateur qui a envoye l'offre.

## Solution

Ajouter le champ `reply_to` dans l'appel a l'API Resend avec l'email de l'utilisateur authentifie. L'utilisateur est deja verifie dans la fonction (ligne 43-54), son email est disponible via `user.email`.

## Modification

### `supabase/functions/send-offer-email/index.ts`

Ajouter `reply_to: [user.email]` dans le body envoye a Resend (ligne 90-101) :

```typescript
body: JSON.stringify({
  from: 'iTakecare <noreply@itakecare.be>',
  to: [to],
  reply_to: [user.email],  // <-- AJOUT
  subject,
  html: message,
  attachments: [
    {
      filename: pdfFilename || `offre-${offerId}.pdf`,
      content: pdfBase64,
    }
  ],
}),
```

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/send-offer-email/index.ts` | Ajouter `reply_to: [user.email]` dans l'appel Resend |

## Resultat

Quand le client repond a l'email d'offre, la reponse sera adressee directement a l'utilisateur qui a envoye l'offre (ex: `commercial@entreprise.com`) au lieu de `noreply@itakecare.be`.

Aucune modification cote frontend n'est necessaire car l'email de l'utilisateur est deja disponible dans la fonction via l'authentification JWT.
