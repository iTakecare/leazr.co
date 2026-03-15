

## Plan : Supprimer l'email de confirmation client, garder la création de compte

### Problème
L'email de confirmation (récapitulatif de demande) est envoyé systématiquement au client (lignes 630-649), même quand aucun compte n'est créé. Cet email fait doublon avec celui d'iTakecare.

### Modification

**Fichier** : `supabase/functions/create-product-request/index.ts` (lignes 563-650)

Restructurer le bloc "ENVOI D'EMAIL AU CLIENT" :

1. **Conserver** la récupération SMTP, company info, et le bloc `if (data.create_client_account)` (lignes 604-628) — création de compte + génération du template `generateClientAccountEmail` avec lien mot de passe

2. **Déplacer** l'envoi Resend (lignes 630-649) **à l'intérieur** du bloc `if (data.create_client_account)`, juste après la génération du `htmlContent` avec `generateClientAccountEmail` — l'email n'est envoyé **que** si un compte a été créé avec succès et le lien de mot de passe a été généré

3. **Supprimer** les lignes 592-601 qui génèrent le template `generateClientConfirmationEmail` (le récapitulatif générique) — ce template ne sera plus utilisé ici

4. **Conserver** intégralement la section "NOTIFICATION AUX ADMINISTRATEURS" (ligne 652+)

### Résultat
- Compte créé → email avec lien mot de passe envoyé ✓
- Pas de création de compte → aucun email client envoyé ✓
- Notification admin → toujours envoyée ✓

