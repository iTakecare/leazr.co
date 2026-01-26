
# Plan : Ajouter l'Option d'Email de Clôture dans la Modale "Sans Suite"

## Objectif

Permettre à l'utilisateur d'envoyer un email au client lors du classement sans suite (Score D), expliquant que malgré plusieurs tentatives de contact ou demandes de documents, le dossier est clôturé, tout en invitant le client à reprendre contact si nécessaire.

---

## Fichiers à Modifier/Créer

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/NoFollowUpModal.tsx` | Ajouter checkbox email + éditeur de contenu |
| `src/services/offers/offerEmail.ts` | Ajouter fonction `sendNoFollowUpEmail` |
| `supabase/functions/send-no-follow-up-email/index.ts` | Créer l'edge function pour envoyer l'email |

---

## 1. Modification de `NoFollowUpModal.tsx`

### Nouveaux états à ajouter

```typescript
const [sendEmail, setSendEmail] = useState(false);
const [emailTitle, setEmailTitle] = useState("📁 Clôture de votre dossier");
const [emailContent, setEmailContent] = useState<string>(DEFAULT_NO_FOLLOW_UP_HTML);
```

### Template email par défaut

```typescript
const DEFAULT_NO_FOLLOW_UP_HTML = `<p>Bonjour {{client_name}},</p>

<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>

<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>

<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>

<p>Nous restons à votre disposition.</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>`;
```

### Nouvelle section UI (après la sélection de raison)

Une checkbox permettant d'activer l'envoi d'email, suivie de l'éditeur ReactQuill si activée :

```text
┌─────────────────────────────────────────────────┐
│ ☐ Envoyer un email de clôture au client         │
│                                                 │
│ (si cochée, affiche l'éditeur ci-dessous)       │
├─────────────────────────────────────────────────┤
│ Titre de l'email: [📁 Clôture de votre dossier] │
│                                                 │
│ Corps de l'email:                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Éditeur ReactQuill avec le template]       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ⚠️ L'email sera envoyé via Resend              │
└─────────────────────────────────────────────────┘
```

### Modification des boutons d'action

Deux boutons seront affichés quand l'email est activé :
- **"Classer sans suite et envoyer email"** (bouton principal)
- **"Classer sans suite SANS envoyer d'email"** (bouton secondaire)

Si l'email n'est pas coché, un seul bouton "Classer sans suite" sera affiché.

---

## 2. Service Email Client-Side

### Nouvelle fonction dans `src/services/offers/offerEmail.ts`

```typescript
/**
 * Envoie l'email de clôture pour dossier sans suite
 */
export const sendNoFollowUpEmail = async (
  offerId: string,
  customTitle?: string,
  customContent?: string
): Promise<boolean> => {
  const { error } = await supabase.functions.invoke('send-no-follow-up-email', {
    body: { offerId, customTitle, customContent }
  });

  if (error) throw error;
  return true;
};
```

---

## 3. Edge Function Backend

### Nouveau fichier `supabase/functions/send-no-follow-up-email/index.ts`

Structure similaire à `send-leasing-rejection-email` avec :
- Récupération de l'offre (client_email, client_name)
- Remplacement des variables `{{client_name}}`
- Template HTML avec header gris/neutre (au lieu de rouge pour refus)
- Envoi via Resend API

### Design de l'email

```text
┌─────────────────────────────────────────────────┐
│  📁 Clôture de votre dossier                    │ ← Header gris
├─────────────────────────────────────────────────┤
│                                                 │
│  Bonjour [Client],                              │
│                                                 │
│  Nous avons tenté de vous joindre à plusieurs   │
│  reprises concernant votre demande...           │
│                                                 │
│  [...contenu personnalisable...]                │
│                                                 │
├─────────────────────────────────────────────────┤
│  iTakecare SRL | www.itakecare.be               │
└─────────────────────────────────────────────────┘
```

---

## 4. Flux Complet

```text
Utilisateur clique "Classer sans suite"
        │
        ▼
NoFollowUpModal s'ouvre
        │
        ├── Sélectionne une raison (obligatoire)
        │
        ├── Coche "Envoyer un email au client" (optionnel)
        │       │
        │       └── Si coché : affiche éditeur d'email
        │
        └── Clique sur "Valider"
                │
                ├── Si email activé :
                │       └── Appel sendNoFollowUpEmail()
                │               └── Edge function envoie l'email
                │
                └── Dans tous les cas :
                        └── updateOfferStatus() → without_follow_up
                        └── internal_score = 'D'
                        └── Toast de confirmation
```

---

## 5. Détails des Modifications UI

### Dans NoFollowUpModal.tsx

#### Imports à ajouter
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
```

#### Nouvelle section après le commentaire
La section email sera affichée entre le commentaire et le badge Score D :

1. Checkbox "Envoyer un email de clôture au client"
2. Si cochée : Input pour le titre + ReactQuill pour le contenu
3. Message d'avertissement "L'email sera envoyé via Resend"

#### Modification de handleSubmit
- Si `sendEmail === true` : appeler `sendNoFollowUpEmail()` avant de mettre à jour le statut
- Gérer les erreurs d'envoi d'email séparément

---

## 6. Template Email par Défaut (Complet)

Le contenu proposé correspond à votre demande :

> "Après avoir tenté de vous joindre plusieurs fois ou vous avoir demandé des documents, sans nouvelle de votre part, nous sommes contraints de clore le dossier. Si toutefois c'est une erreur ou un oubli, n'hésitez pas à nous recontacter pour relancer le dossier."

Ce message sera personnalisable via ReactQuill avant envoi.

---

## Récapitulatif Technique

| Composant | Modification |
|-----------|-------------|
| **NoFollowUpModal.tsx** | + États email, + Section UI avec checkbox/éditeur, + Logique handleSubmit |
| **offerEmail.ts** | + Fonction `sendNoFollowUpEmail()` |
| **Edge Function** | + Nouveau `send-no-follow-up-email` basé sur `send-leasing-rejection-email` |
