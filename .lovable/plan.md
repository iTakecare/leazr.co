

## Corrections et améliorations du module Support

### 3 chantiers

---

### 1. Corriger la synchronisation IMAP

**Problème identifié** : Les logs montrent l'erreur `null value in column "imap_password_encrypted"` -- la migration DROP NOT NULL a été appliquée APRÈS les tentatives. La colonne est maintenant nullable, mais l'edge function n'a pas été redéployée avec le dernier code. De plus, Supabase Edge Functions ne supportent pas `Deno.connectTls` / `Deno.connect` pour les connexions TCP brutes vers des serveurs IMAP.

**Solution** : Réécrire la synchronisation IMAP en utilisant une approche compatible :
- Utiliser la librairie `npm:imapflow` (compatible Deno) qui gère les connexions IMAP proprement
- Si imapflow ne fonctionne pas dans l'environnement Edge, fallback sur un appel HTTP à un service IMAP-to-API, ou bien stocker le mot de passe et documenter que la sync doit tourner depuis un serveur externe
- Ajouter un try/catch détaillé avec messages d'erreur explicites pour chaque étape (connexion, auth, fetch)
- Redéployer l'edge function

**Fichier** : `supabase/functions/sync-imap-emails/index.ts`

---

### 2. Ajouter le sélecteur de période de synchronisation

**Migration SQL** : Ajouter colonne `sync_days integer DEFAULT 7` à `user_imap_settings`

**Frontend** (`ImapSettingsForm.tsx`) :
- Ajouter un `<Select>` avec les options : 5 jours, 10 jours, 15 jours, 1 mois, 2 mois, 3 mois, 6 mois
- Sauvegarder la valeur dans le champ `sync_days`
- Afficher entre le champ "Dossier" et les switches SSL/Actif

**Edge function** : Utiliser `sync_days` au lieu du `7` hardcodé pour calculer la date SEARCH SINCE

---

### 3. Analyse IA des emails avec suggestions

**Migration SQL** : Ajouter colonnes à `synced_emails` :
- `ai_analysis text` (résumé + classification IA)
- `ai_suggestions jsonb` (suggestions structurées : client lié, demande détectée, actions recommandées)
- `ai_analyzed_at timestamptz`

**Nouvelle edge function** `analyze-email` :
- Reçoit `email_id` en body
- Lit l'email depuis `synced_emails`
- Lit la liste des clients de la company depuis `clients`
- Appelle Lovable AI (google/gemini-3-flash-preview) avec tool calling pour extraire :
  - Résumé de l'email
  - Sentiment (positif/neutre/négatif)
  - Client potentiellement lié (match par nom/email dans la base clients)
  - Type de demande (support, commercial, facturation, autre)
  - Actions suggérées (créer ticket, créer tâche, répondre, lier à client)
- Stocke le résultat dans `ai_analysis` et `ai_suggestions`

**Frontend** (`EmailDetail.tsx`) :
- Ajouter un bouton "Analyser avec IA" (icône Sparkles)
- Afficher les suggestions dans un encart sous les boutons d'action :
  - Client détecté → bouton "Lier à ce client"
  - Type de demande → badge coloré
  - Actions suggérées → boutons cliquables
- Si déjà analysé, afficher directement les résultats

**Fichiers modifiés/créés** :
| Fichier | Action |
|---------|--------|
| `supabase/functions/sync-imap-emails/index.ts` | Fix sync + utiliser sync_days |
| `supabase/functions/analyze-email/index.ts` | Nouvelle edge function IA |
| `supabase/config.toml` | Ajouter `[functions.analyze-email]` |
| `src/components/support/ImapSettingsForm.tsx` | Ajouter sélecteur période |
| `src/components/support/EmailDetail.tsx` | Ajouter analyse IA + suggestions |
| `src/integrations/supabase/types.ts` | Auto-update après migration |
| Migration SQL | `sync_days` + colonnes IA |

