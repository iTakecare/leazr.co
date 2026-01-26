
# Plan : Ajouter la Colonne Droite "Email de Clôture" pour Score D dans ScoringModal

## Objectif

Ajouter une colonne droite dans `ScoringModal.tsx` pour le Score D, similaire à Score B et Score C, permettant d'envoyer optionnellement un email de clôture au client expliquant que le dossier est clos faute de nouvelles.

---

## Fichier à Modifier

| Fichier | Action |
|---------|--------|
| `src/components/offers/detail/ScoringModal.tsx` | Ajouter la colonne droite pour Score D avec email optionnel |

---

## Modifications Techniques

### 1. Nouveaux États à Ajouter

```typescript
// États pour l'email de clôture (score D)
const [sendNoFollowUpEmail, setSendNoFollowUpEmail] = useState(false);
const [noFollowUpEmailTitle, setNoFollowUpEmailTitle] = useState("📁 Clôture de votre dossier");
const [noFollowUpEmailContent, setNoFollowUpEmailContent] = useState<string>(DEFAULT_NO_FOLLOW_UP_HTML);
```

### 2. Constante pour le Template Email par Défaut

```typescript
const DEFAULT_NO_FOLLOW_UP_HTML = `<p>Bonjour {{client_name}},</p>

<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>

<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>

<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>

<p>Nous restons à votre disposition.</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>`;
```

### 3. Mise à Jour de la Condition d'Élargissement du Dialog

Modifier la ligne 510 pour inclure Score D :

```typescript
// Avant
<DialogContent className={`${(selectedScore === 'B' || selectedScore === 'C') ? 'max-w-4xl' : 'max-w-2xl'} ...`}>

// Après
<DialogContent className={`${(selectedScore === 'B' || selectedScore === 'C' || selectedScore === 'D') ? 'max-w-4xl' : 'max-w-2xl'} ...`}>
```

Et modifier la ligne 522 :

```typescript
// Avant
<div className={`space-y-6 ${(selectedScore === 'B' || selectedScore === 'C') ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>

// Après
<div className={`space-y-6 ${(selectedScore === 'B' || selectedScore === 'C' || selectedScore === 'D') ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
```

### 4. Nouvelle Section UI - Colonne Droite pour Score D

Ajouter après la section Score C (ligne 806) :

```tsx
{/* Section Email de clôture (visible uniquement pour score D) */}
{selectedScore === 'D' && (
  <Card className="border-2 border-gray-200 bg-gray-50/30">
    <CardHeader className="pb-4">
      <CardTitle className="text-lg flex items-center gap-2">
        <Mail className="h-5 w-5 text-gray-600" />
        Email de clôture (optionnel)
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Envoyez optionnellement un email au client pour l'informer de la clôture du dossier.
      </p>
    </CardHeader>

    <CardContent className="space-y-4">
      {/* Checkbox pour activer l'email */}
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="send-no-follow-up-email" 
          checked={sendNoFollowUpEmail}
          onCheckedChange={(checked) => setSendNoFollowUpEmail(checked === true)}
        />
        <label 
          htmlFor="send-no-follow-up-email"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Envoyer un email de clôture au client
        </label>
      </div>

      {/* Contenu de l'email (visible si checkbox cochée) */}
      {sendNoFollowUpEmail && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Titre de l'email</label>
            <Input
              value={noFollowUpEmailTitle}
              onChange={(e) => setNoFollowUpEmailTitle(e.target.value)}
              placeholder="Titre de l'email..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Corps de l'email</label>
            <ReactQuill
              value={noFollowUpEmailContent}
              onChange={setNoFollowUpEmailContent}
              theme="snow"
              modules={{ toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link'], ['clean']] }}
              className="bg-white rounded-md"
            />
          </div>

          <div className="flex items-center text-gray-600 text-xs bg-gray-100 p-2 rounded">
            <AlertCircle className="h-3 w-3 mr-1" />
            L'email sera envoyé via Resend avec votre clé configurée
          </div>
        </>
      )}

      {!sendNoFollowUpEmail && (
        <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600 flex items-center gap-2">
          <UserX className="h-4 w-4" />
          <span>Aucun email ne sera envoyé - Le dossier pourra être réactivé ultérieurement</span>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### 5. Nouvelles Fonctions de Gestion

Ajouter deux nouvelles fonctions :

```typescript
// Envoyer email de clôture et valider score D
const handleSendNoFollowUpAndValidate = async () => {
  if (!selectedNoFollowUpReason) {
    toast.error("Veuillez sélectionner une raison");
    return;
  }

  try {
    setIsSending(true);
    
    // Envoyer l'email de clôture via l'edge function
    const { sendNoFollowUpEmail: sendEmail } = await import('@/services/offers/offerEmail');
    await sendEmail(offerId, noFollowUpEmailTitle, noFollowUpEmailContent);
    
    // Valider le score D
    const reasonLabel = NO_FOLLOW_UP_REASONS.find(r => r.code === selectedNoFollowUpReason)?.label || selectedNoFollowUpReason;
    const fullReason = reason.trim() 
      ? `${reasonLabel}\n\nCommentaire: ${reason.trim()}`
      : reasonLabel;
    
    await onScoreAssigned('D', fullReason);
    toast.success("Email de clôture envoyé et dossier classé sans suite");
    onClose();
  } catch (error) {
    console.error("Erreur:", error);
    toast.error("Erreur lors de l'envoi de l'email");
  } finally {
    setIsSending(false);
  }
};

// Valider score D sans envoyer d'email
const handleValidateDWithoutEmail = async () => {
  // ... (code existant dans handleSubmit pour score D)
};
```

### 6. Modification des Boutons d'Action pour Score D

Remplacer le bouton unique actuel (lignes 902-921) par deux boutons :

```tsx
selectedScore === 'D' ? (
  <>
    {sendNoFollowUpEmail ? (
      <>
        {/* Bouton principal : Envoyer email */}
        <Button 
          onClick={handleSendNoFollowUpAndValidate}
          disabled={isLoading || isSending || !selectedNoFollowUpReason}
          size="lg"
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          <Mail className="mr-2 h-4 w-4" />
          Classer et envoyer l'email
        </Button>
        
        {/* Bouton alternatif : Sans email */}
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || isSending || !selectedNoFollowUpReason}
          variant="secondary"
          size="lg"
        >
          <UserX className="mr-2 h-4 w-4" />
          Classer sans envoyer d'email
        </Button>
      </>
    ) : (
      /* Si email non coché, un seul bouton */
      <Button 
        onClick={handleSubmit}
        disabled={isLoading || isSending || !selectedNoFollowUpReason}
        size="lg"
        className="bg-gray-600 hover:bg-gray-700 text-white"
      >
        <UserX className="mr-2 h-4 w-4" />
        Classer sans suite (Score D)
      </Button>
    )}
  </>
)
```

---

## Structure Finale de la Modale pour Score D

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 Analyse interne                                                      │
├───────────────────────────────────┬─────────────────────────────────────┤
│ Évaluation du dossier            │ 📧 Email de clôture (optionnel)     │
│ ────────────────────────────────  │ ────────────────────────────────    │
│ ○ Score A - Approuvé              │ ☐ Envoyer un email de clôture      │
│ ○ Score B - Documents requis      │                                     │
│ ○ Score C - Refusé                │ (si coché, affiche :)               │
│ ● Score D - Sans suite ◄          │ ┌─────────────────────────────────┐ │
│                                   │ │ Titre: [📁 Clôture de votre...] │ │
│ Raison: [Plus de nouvelles...]    │ │                                 │ │
│                                   │ │ Corps de l'email:               │ │
│ Commentaire (optionnel):          │ │ [ReactQuill Editor]             │ │
│ [________________________]        │ └─────────────────────────────────┘ │
│                                   │                                     │
│                                   │ (si non coché :)                    │
│                                   │ ⚠️ Aucun email ne sera envoyé      │
├───────────────────────────────────┴─────────────────────────────────────┤
│                      [Annuler] [Classer sans email] [Classer et envoyer]│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Récapitulatif des Changements

| Élément | Modification |
|---------|-------------|
| **États** | + `sendNoFollowUpEmail`, `noFollowUpEmailTitle`, `noFollowUpEmailContent` |
| **Constantes** | + `DEFAULT_NO_FOLLOW_UP_HTML` |
| **Dialog** | Élargissement à `max-w-4xl` pour Score D |
| **Layout** | Activation grille 2 colonnes pour Score D |
| **UI** | + Card "Email de clôture" avec checkbox + éditeur conditionnel |
| **Fonctions** | + `handleSendNoFollowUpAndValidate()` |
| **Boutons** | 2 boutons si email coché, 1 bouton sinon |
