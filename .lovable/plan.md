
# Plan : Prévisualiser le PDF avant l'envoi du rappel

## Objectif

Ajouter un bouton "Prévisualiser le PDF" dans le modal `SendReminderModal` pour permettre à l'utilisateur de voir le PDF de l'offre qui sera joint à l'email avant de l'envoyer.

## Contexte Actuel

- Le modal génère déjà le PDF lors de l'envoi via `generateCommercialOfferPDF(offer.id)` (ligne 311)
- Les composants `PDFViewer` et le hook `usePDFPreview` existent déjà dans le projet
- Le bouton de prévisualisation ne doit apparaître que pour les rappels de type `offer_reminder` (qui incluent un PDF)

## Design Proposé

```text
┌────────────────────────────────────────────────────────────────┐
│  📧 Rappel Offre L1 - Jean Dupont                        [x]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Destinataire: jean@example.com                                │
│                                                                │
│  Type de rappel: [Docs L1] [Docs L2] [Offre L1*] [Offre L2]   │
│                                                                │
│  Sujet: [_____________________________________]                │
│                                                                │
│  Message personnalisé (optionnel)                              │
│  [Éditeur riche ________________________]                      │
│                                                                │
│  Signature de l'email: [Sélection ▼]                           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📄 Pièce jointe PDF                                      │ │
│  │                                                          │ │
│  │ Offre_Jean_Dupont.pdf           [ 👁️ Prévisualiser ]    │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Aperçu de l'email                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Contenu HTML de l'email...]                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                           [Annuler]  [Envoyer le rappel 📤]    │
└────────────────────────────────────────────────────────────────┘
```

## Fichier à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/offers/SendReminderModal.tsx` | Ajouter le hook `usePDFPreview`, le composant `PDFViewer`, et un bouton de prévisualisation |

## Modifications Techniques

### 1. Imports à ajouter

```typescript
import { usePDFPreview } from "@/hooks/usePDFPreview";
import { PDFViewer } from "@/components/pdf/PDFViewer";
import { Eye } from "lucide-react";
```

### 2. État pour la prévisualisation

Dans le composant, après les autres états (vers ligne 63-76) :

```typescript
// PDF Preview
const { isOpen: isPdfPreviewOpen, pdfBlob: previewPdfBlob, filename: previewFilename, openPDFPreview, closePDFPreview } = usePDFPreview();
const [generatingPreview, setGeneratingPreview] = useState(false);
```

### 3. Fonction de prévisualisation

Ajouter une fonction pour générer et afficher le PDF :

```typescript
const handlePreviewPDF = async () => {
  setGeneratingPreview(true);
  try {
    const pdfBlob = await generateCommercialOfferPDF(offer.id);
    const filename = `Offre_${offer.client_name?.replace(/\s+/g, '_') || offer.id}.pdf`;
    openPDFPreview(pdfBlob, filename);
  } catch (error) {
    console.error('Erreur génération PDF preview:', error);
    toast.error("Erreur lors de la génération du PDF");
  } finally {
    setGeneratingPreview(false);
  }
};
```

### 4. Nouveau bloc UI - Section pièce jointe PDF

Ajouter entre la sélection du signataire (ligne 529) et l'aperçu de l'email (ligne 531) :

```tsx
{/* PDF Attachment Preview - only for offer reminders */}
{selectedReminder?.type === 'offer_reminder' && (
  <div className="space-y-2">
    <Label className="flex items-center gap-2">
      <FileText className="h-4 w-4" />
      Pièce jointe PDF
    </Label>
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium">
          Offre_{offer.client_name?.replace(/\s+/g, '_') || offer.id}.pdf
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviewPDF}
        disabled={generatingPreview}
      >
        {generatingPreview ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Génération...
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </>
        )}
      </Button>
    </div>
    <p className="text-xs text-muted-foreground">
      Ce PDF sera automatiquement joint à l'email de rappel.
    </p>
  </div>
)}
```

### 5. Composant PDFViewer

Ajouter le composant PDFViewer à la fin du return, avant le `</Dialog>` (après ligne 573) :

```tsx
{/* PDF Preview Modal */}
<PDFViewer
  isOpen={isPdfPreviewOpen}
  onClose={closePDFPreview}
  pdfBlob={previewPdfBlob}
  filename={previewFilename}
/>
```

## Comportement

1. L'utilisateur sélectionne un rappel de type "Offre L1/L2/L3"
2. Une section "Pièce jointe PDF" apparaît avec le nom du fichier
3. L'utilisateur clique sur "Prévisualiser"
4. Le PDF est généré (loader visible)
5. Un dialog s'ouvre avec le PDF affiché via `PDFViewer`
6. L'utilisateur peut zoomer, naviguer entre les pages, ou télécharger
7. L'utilisateur ferme l'aperçu et peut ensuite envoyer l'email

## Avantages

- Réutilise les composants existants (`PDFViewer`, `usePDFPreview`)
- Ne bloque pas le flux d'envoi
- Permet de vérifier le contenu avant envoi
- Génération indépendante de l'envoi (preview ≠ envoi)

## Note technique

La génération du PDF lors de la prévisualisation est **séparée** de celle lors de l'envoi. Cela signifie que le PDF sera généré deux fois si l'utilisateur prévisualise puis envoie. C'est voulu pour :
- Garantir que le PDF envoyé est toujours à jour
- Éviter de conserver un gros blob en mémoire pendant toute la session du modal
