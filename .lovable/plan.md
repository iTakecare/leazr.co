
# Plan : Textes d'Email Personnalisés par Raison + Suppression de la Checkbox

## Résumé

Modifier l'interface Score D dans `ScoringModal.tsx` pour :
1. Supprimer la checkbox "Envoyer un email de clôture au client" 
2. Toujours afficher l'éditeur d'email
3. Charger automatiquement un texte d'email différent selon la raison sélectionnée

---

## Fichier à Modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/ScoringModal.tsx` | Modifier la section Score D |

---

## 1. Nouveaux Templates Email par Raison

Créer une constante `NO_FOLLOW_UP_EMAIL_TEMPLATES` avec un texte adapté à chaque raison :

```typescript
const NO_FOLLOW_UP_EMAIL_TEMPLATES: Record<string, string> = {
  no_response: `<p>Bonjour {{client_name}},</p>
<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>
<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>
<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>
<p>Nous restons à votre disposition.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`,

  project_postponed: `<p>Bonjour {{client_name}},</p>
<p>Nous avons bien pris note que votre projet de leasing informatique a été reporté.</p>
<p>Nous procédons donc à la <strong>clôture temporaire de votre dossier</strong>.</p>
<p>Lorsque vous serez prêt à relancer votre projet, n'hésitez pas à nous recontacter. Nous serons heureux de reprendre l'étude de votre demande.</p>
<p>Nous restons à votre disposition pour toute question.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`,

  went_competitor: `<p>Bonjour {{client_name}},</p>
<p>Nous avons pris note de votre décision de poursuivre votre projet avec un autre prestataire.</p>
<p>Nous procédons donc à la <strong>clôture de votre dossier</strong>.</p>
<p>Si vous souhaitez nous solliciter pour un futur projet, nous serons heureux de vous accompagner.</p>
<p>Nous vous souhaitons une excellente continuation.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`,

  budget_issue: `<p>Bonjour {{client_name}},</p>
<p>Nous comprenons que des contraintes budgétaires ne vous permettent pas de poursuivre votre projet de leasing informatique pour le moment.</p>
<p>Nous procédons donc à la <strong>clôture de votre dossier</strong>.</p>
<p>Si votre situation évolue, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>
<p>Nous restons à votre disposition.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`,

  project_cancelled: `<p>Bonjour {{client_name}},</p>
<p>Nous avons bien pris note de l'annulation de votre projet de leasing informatique.</p>
<p>Nous procédons donc à la <strong>clôture définitive de votre dossier</strong>.</p>
<p>Si un nouveau projet venait à se présenter, nous serions heureux de vous accompagner.</p>
<p>Nous vous souhaitons une excellente continuation dans vos activités.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`,

  other: `<p>Bonjour {{client_name}},</p>
<p>Suite à nos échanges, nous procédons à la <strong>clôture de votre dossier</strong> de demande de leasing informatique.</p>
<p>Si vous souhaitez reprendre ce projet ultérieurement, n'hésitez pas à nous recontacter. Nous serons heureux de vous accompagner.</p>
<p>Nous restons à votre disposition pour toute question.</p>
<p>Cordialement,<br/>L'équipe iTakecare</p>`
};
```

---

## 2. Suppression de la Variable d'État `sendNoFollowUpEmailState`

- Supprimer `const [sendNoFollowUpEmailState, setSendNoFollowUpEmailState] = useState(false);`
- L'éditeur d'email sera toujours visible quand Score D est sélectionné

---

## 3. Mise à Jour Dynamique du Contenu Email

Modifier le `useEffect` ou `handleScoreSelection` pour mettre à jour le contenu de l'email quand la raison change :

```typescript
// Dans handleScoreSelection ou via useEffect sur selectedNoFollowUpReason
useEffect(() => {
  if (selectedNoFollowUpReason && selectedScore === 'D') {
    const template = NO_FOLLOW_UP_EMAIL_TEMPLATES[selectedNoFollowUpReason] || NO_FOLLOW_UP_EMAIL_TEMPLATES.other;
    setNoFollowUpEmailContent(template);
  }
}, [selectedNoFollowUpReason, selectedScore]);
```

---

## 4. Modification de l'Interface Score D

Supprimer la checkbox et afficher directement l'éditeur d'email :

**Avant (lignes 870-928)** :
```text
┌─────────────────────────────────┐
│ ☐ Envoyer un email de clôture   │  ← À SUPPRIMER
│                                 │
│ (si coché, affiche éditeur)     │
│ (sinon, message "Aucun email")  │
└─────────────────────────────────┘
```

**Après** :
```text
┌─────────────────────────────────────────────┐
│ 📧 Email de clôture (optionnel)             │
│                                             │
│ Titre: [📁 Clôture de votre dossier]        │
│                                             │
│ Corps de l'email:                           │
│ [ReactQuill avec texte adapté à la raison]  │
│                                             │
│ ⚠️ L'email sera envoyé via Resend           │
└─────────────────────────────────────────────┘
```

---

## 5. Simplification des Boutons d'Action Score D

Puisque l'éditeur est toujours visible, afficher toujours les deux boutons :

**Avant (lignes 1027-1093)** :
```typescript
// Si sendNoFollowUpEmailState → 2 boutons
// Sinon → 1 bouton
```

**Après** :
```typescript
// Toujours 2 boutons :
// 1. "Classer et envoyer l'email" 
// 2. "Classer sans envoyer d'email"
```

---

## 6. Récapitulatif des Modifications

| Section | Modification |
|---------|-------------|
| **États** | Supprimer `sendNoFollowUpEmailState` |
| **Constantes** | Ajouter `NO_FOLLOW_UP_EMAIL_TEMPLATES` avec 6 templates |
| **useEffect** | Ajouter mise à jour dynamique du contenu email selon raison |
| **UI Score D** | Supprimer checkbox, afficher éditeur directement |
| **Boutons D** | Toujours afficher 2 boutons (avec/sans email) |

---

## 7. Comportement Final

| Action | Résultat |
|--------|----------|
| Sélectionner Score D | Affiche la raison + l'éditeur d'email |
| Changer la raison | L'email se met à jour automatiquement avec le texte adapté |
| "Classer et envoyer l'email" | Envoie l'email personnalisé + classe sans suite |
| "Classer sans envoyer d'email" | Classe sans suite sans envoyer d'email |

---

## 8. Exemple de Flux Utilisateur

```text
1. Sélectionner "Score D - Sans suite"
2. Choisir raison : "Plus de nouvelles après relances"
   → L'email affiche automatiquement le texte correspondant
3. (Optionnel) Modifier le texte de l'email
4. Clic sur :
   - "Classer et envoyer l'email" → Email envoyé + dossier clos
   - "Classer sans envoyer d'email" → Dossier clos silencieusement
```
