

# Email de bienvenue automatique 1 semaine après livraison

## Contexte
Les contrats ont un champ `delivery_date` (date) et `delivery_status` (text). Quand un contrat est livré, on veut envoyer automatiquement un email de bienvenue/suivi 7 jours après, avec invitation à laisser un avis Trustpilot et Google My Business. Il n'existe pas encore de champ pour traquer si cet email a été envoyé.

## Plan

### 1. Migration DB — Ajouter un champ de suivi
Ajouter `welcome_followup_sent_at` (timestamptz, nullable) à la table `contracts` pour éviter les envois en double.

### 2. Edge Function `send-welcome-followup-email`
Fonction CRON-compatible (appelée périodiquement) qui :
- Cherche les contrats où `delivery_date <= now() - 7 jours` ET `welcome_followup_sent_at IS NULL` ET `delivery_status` in ('livre', 'delivered') OU `status` = 'active'
- Pour chaque contrat trouvé, envoie un email via Resend au `client_email` avec :
  - Message de bienvenue / prise de nouvelles
  - Bouton Trustpilot (lien configurable)
  - Bouton Google My Business (lien existant `GOOGLE_REVIEW_URL`)
  - Template HTML professionnel cohérent avec les emails existants
- Met à jour `welcome_followup_sent_at` pour ne pas renvoyer

### 3. Configuration CRON
Créer un cron job (`pg_cron` + `pg_net`) qui appelle la fonction quotidiennement pour détecter les contrats éligibles.

### 4. Config.toml
Ajouter `[functions.send-welcome-followup-email]` avec `verify_jwt = false` (appelé par cron).

### Fichiers impactés
| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonne `welcome_followup_sent_at` |
| `supabase/functions/send-welcome-followup-email/index.ts` | Nouvelle edge function |
| `supabase/config.toml` | Ajouter config fonction |
| SQL cron | Planifier l'appel quotidien |

