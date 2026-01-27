
# Plan : Ajouter une adresse email en copie (CC) pour les contrats

## Objectif

Permettre de spécifier deux adresses email lors de l'envoi d'un contrat en propre (self-leasing) :
1. **Email principal** : destinataire pour la signature
2. **Email en copie (CC)** : reçoit le contrat en copie (comptabilité, manager, etc.)

## État Actuel

| Élément | Situation actuelle |
|---------|-------------------|
| Table `contracts` | 1 seul champ `client_email` |
| Modal d'envoi | 1 seul champ destinataire |
| Edge function | Envoie à 1 seul `to` |

## Modifications Requises

### 1. Migration Base de Données

Ajouter un nouveau champ `cc_email` à la table `contracts` :

```sql
ALTER TABLE contracts 
ADD COLUMN cc_email TEXT;

COMMENT ON COLUMN contracts.cc_email IS 'Adresse email en copie lors de l''envoi du contrat';
```

### 2. Modal d'envoi `SendContractEmailModal.tsx`

**Fichier** : `src/components/offers/detail/SendContractEmailModal.tsx`

Ajouter un second champ email pour la copie :

```text
┌─────────────────────────────────────────────────────────────┐
│ 📧 Envoyer le contrat de location                      [x]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email du destinataire (signature)                          │
│  [client@example.com_____________________________]          │
│                                                             │
│  Email en copie (optionnel)                                 │
│  [comptabilite@example.com_______________________]          │
│  ℹ️ Cette personne recevra le contrat en copie              │
│                                                             │
│  Objet du mail                                              │
│  [Contrat de location - REF-001__________________]          │
│                                                             │
│  Corps du message                                           │
│  [________________________________________________]         │
│  [________________________________________________]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [Annuler]  [Envoyer le contrat 📤] │
└─────────────────────────────────────────────────────────────┘
```

**Modifications** :
- Ajouter state `ccEmail` (ligne ~42)
- Ajouter champ Input pour le CC (après ligne 233)
- Passer `cc` au body de l'appel edge function (ligne 177)
- Sauvegarder dans `contracts.cc_email` (ligne 151)

### 3. Edge Function `send-contract-email`

**Fichier** : `supabase/functions/send-contract-email/index.ts`

**Modifications** :
- Ajouter `cc?: string` dans l'interface `ContractEmailRequest`
- Utiliser le paramètre `cc` de Resend lors de l'envoi

```typescript
// Interface mise à jour
interface ContractEmailRequest {
  to: string;
  cc?: string;  // Nouveau champ optionnel
  subject: string;
  body: string;
  signatureLink: string;
  contractId: string;
  contractNumber?: string;
  offerNumber?: string;
}

// Envoi avec CC
const emailResponse = await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: [to],
  cc: cc ? [cc] : undefined,  // Ajouter CC si présent
  subject: subject,
  html: htmlContent,
});
```

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| Migration SQL | Ajouter colonne `cc_email` à `contracts` |
| `src/components/offers/detail/SendContractEmailModal.tsx` | Ajouter champ CC + envoyer dans l'API |
| `supabase/functions/send-contract-email/index.ts` | Supporter le paramètre `cc` dans Resend |

## Comportement Final

1. L'utilisateur ouvre le modal d'envoi du contrat
2. Il peut (optionnellement) ajouter une adresse en copie
3. L'email est envoyé au destinataire principal ET à l'adresse CC
4. Les deux adresses reçoivent le même email avec le bouton "Signer le contrat"
5. Le champ `cc_email` est sauvegardé dans le contrat pour historique

## Notes Techniques

- Le champ CC est **optionnel** - pas de changement pour les utilisateurs actuels
- L'API Resend supporte nativement le champ `cc`
- L'email CC reçoit exactement le même contenu (pas de différenciation)
- L'adresse CC est stockée pour pouvoir la réutiliser lors des relances
