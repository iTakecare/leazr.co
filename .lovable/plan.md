
## Plan : Système de notification email pour les documents uploadés

### Contexte et problèmes identifiés

L'edge function `notify-admins-document-upload` existe mais ne fonctionne pas pour plusieurs raisons :

1. **Mauvais nom de secret** : Utilise `RESEND_API_KEY` alors que le secret configuré est `ITAKECARE_RESEND_API`
2. **Emails non groupés** : Actuellement, un email est envoyé par document (non optimal)
3. **Commercial non notifié** : Le créateur de l'offre (commercial/broker via `user_id`) n'est pas inclus
4. **URL incorrecte** : Le lien vers l'offre utilise une URL Supabase malformée

### Architecture de la solution

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     Client uploade des documents                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Service uploadDocument() - enregistre dans offer_documents           │
│  + met à jour documents_last_uploaded_at                              │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Supabase Trigger (nouveau) : after_document_upload_batch             │
│  Déclenche un job pg_cron après 3 minutes d'inactivité                │
│  OU appel immédiat si dernier upload + 3min                           │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Edge Function : notify-documents-uploaded (nouvelle)                  │
│  - Récupère tous les documents non notifiés pour l'offre              │
│  - Envoie UN email groupé avec la liste des documents                 │
│  - Destinataires : Admins + Commercial (user_id de l'offre)           │
│  - Crée une notification in-app                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Modifications requises

#### 1. Mettre à jour la table `offers` (migration SQL)

Ajouter un champ pour tracker le dernier upload de document :

```sql
ALTER TABLE offers ADD COLUMN IF NOT EXISTS documents_last_uploaded_at TIMESTAMPTZ;
```

#### 2. Mettre à jour la table `offer_documents` (migration SQL)

Ajouter un champ pour savoir si un document a été notifié :

```sql
ALTER TABLE offer_documents ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
```

#### 3. Créer une nouvelle edge function : `notify-documents-uploaded`

Cette fonction remplacera `notify-admins-document-upload` avec les améliorations suivantes :

- Utilise le bon secret `ITAKECARE_RESEND_API`
- Récupère tous les documents non notifiés pour une offre
- Envoie UN email groupé listant tous les documents
- Notifie les admins ET le commercial (user_id de l'offre)
- Utilise le bon format d'URL avec le company slug
- Crée une notification in-app
- Marque les documents comme notifiés

**Destinataires de l'email :**
- Tous les admins de l'entreprise (via `get_admin_emails_for_company`)
- Le commercial/broker qui a créé l'offre (via `user_id` -> `profiles.email`)

**Template email :**
```text
Objet: 📄 [X] nouveaux documents reçus - [Nom Client]

Corps:
- Liste des documents avec leur type
- Nom du client
- Lien vers l'offre
```

#### 4. Modifier le service `uploadDocument` 

Dans `src/services/offers/offerDocuments.ts` :

- Mettre à jour `documents_last_uploaded_at` sur l'offre à chaque upload
- Appeler la nouvelle edge function avec un délai de regroupement (debounce)

**Approche du regroupement :**
Le frontend utilise un debounce de 5 secondes après le dernier upload avant d'appeler l'edge function. Si plusieurs documents sont uploadés en rafale, un seul appel sera effectué.

#### 5. Supprimer l'ancienne fonction

L'ancienne edge function `notify-admins-document-upload` sera remplacée par la nouvelle.

---

### Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/notify-documents-uploaded/index.ts` | Créer | Nouvelle fonction avec emails groupés |
| `src/services/offers/offerDocuments.ts` | Modifier | Ajouter debounce pour regrouper les notifications |
| Migration SQL | Créer | Ajouter `notified_at` sur `offer_documents` |

---

### Détails techniques

#### Edge function `notify-documents-uploaded`

```typescript
// Logique principale
1. Recevoir offerId
2. Récupérer tous les documents où notified_at IS NULL
3. Récupérer les infos de l'offre (client_name, user_id, company_id)
4. Récupérer le commercial (user_id -> profiles.email)
5. Récupérer les admins (get_admin_emails_for_company)
6. Fusionner les destinataires (admins + commercial, sans doublons)
7. Générer l'email avec la liste des documents
8. Envoyer l'email via Resend (ITAKECARE_RESEND_API)
9. Créer notification in-app
10. Marquer les documents comme notifiés (notified_at = NOW())
```

#### Service frontend avec debounce

```typescript
// Dans uploadDocument(), après l'upload réussi :
// Mettre à jour le timestamp
await supabase.from('offers')
  .update({ documents_last_uploaded_at: new Date().toISOString() })
  .eq('id', offerId);

// Utiliser un debounce global pour éviter les appels multiples
scheduleDocumentNotification(offerId);

// Fonction avec debounce de 5 secondes
const pendingNotifications = new Map();

function scheduleDocumentNotification(offerId: string) {
  // Annuler le timer précédent s'il existe
  if (pendingNotifications.has(offerId)) {
    clearTimeout(pendingNotifications.get(offerId));
  }
  
  // Programmer un nouvel appel dans 5 secondes
  const timer = setTimeout(async () => {
    await supabase.functions.invoke('notify-documents-uploaded', {
      body: { offerId }
    });
    pendingNotifications.delete(offerId);
  }, 5000);
  
  pendingNotifications.set(offerId, timer);
}
```

---

### Résultat attendu

Quand un client uploade des documents :

1. Les documents sont enregistrés normalement
2. Après 5 secondes sans nouvel upload, UN seul email est envoyé contenant :
   - La liste de tous les documents uploadés
   - Les informations du client
   - Un lien direct vers l'offre
3. Les destinataires sont :
   - Tous les admins de l'entreprise
   - Le commercial qui a créé l'offre
4. Une notification in-app est créée pour le suivi
