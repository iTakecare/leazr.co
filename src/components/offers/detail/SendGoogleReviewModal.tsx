import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { sendEmail } from "@/services/emailService";
import RichTextEditor from "@/components/ui/rich-text-editor";

// Lien Google My Business d'iTakecare (à configurer)
const GOOGLE_REVIEW_URL = "https://g.page/r/CXXXXXXXXXReview";

interface SendGoogleReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: any;
}

const SendGoogleReviewModal: React.FC<SendGoogleReviewModalProps> = ({
  open,
  onOpenChange,
  offer
}) => {
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    if (open && offer) {
      // Pré-remplir le formulaire avec les données de l'offre
      setRecipientEmail(offer.client_email || offer.clients?.email || "");
      setEmailSubject("Votre avis compte pour nous - iTakecare");
      
      const clientName = offer.client_name || offer.clients?.name || "Client";
      
      // Template HTML par défaut
      const defaultTemplate = `
<p>Bonjour ${clientName},</p>

<p>Nous tenons à vous remercier pour votre confiance dans le cadre de votre projet de leasing informatique avec iTakecare.</p>

<p>Si vous êtes satisfait de notre accompagnement, nous serions ravis que vous preniez quelques instants pour partager votre expérience en laissant un avis sur notre fiche Google.</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="${GOOGLE_REVIEW_URL}" target="_blank" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
    ⭐ Laisser un avis
  </a>
</p>

<p>Votre retour nous aide à améliorer nos services et permet à d'autres entreprises de nous découvrir.</p>

<p>Merci d'avance pour votre temps !</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>
      `.trim();

      setEmailBody(defaultTemplate);
    }
  }, [open, offer]);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error("Veuillez saisir l'adresse email du destinataire");
      return;
    }

    if (!emailSubject) {
      toast.error("Veuillez saisir l'objet du mail");
      return;
    }

    setIsSending(true);

    try {
      // Envoyer l'email via le service email existant
      const success = await sendEmail(
        recipientEmail,
        emailSubject,
        emailBody
      );

      if (success) {
        toast.success("Demande d'avis Google envoyée avec succès !");
        onOpenChange(false);
      } else {
        toast.error("Erreur lors de l'envoi de l'email");
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Demander un avis Google
          </DialogTitle>
          <DialogDescription>
            Envoyez un email au client pour lui demander de laisser un avis sur votre fiche Google My Business
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Email du destinataire</Label>
            <Input
              id="recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">Email en copie (optionnel)</Label>
            <Input
              id="cc"
              type="email"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              placeholder="copie@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Objet du mail</Label>
            <Input
              id="subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Corps du message</Label>
            <RichTextEditor
              value={emailBody}
              onChange={setEmailBody}
              height={300}
              isEmailEditor
              placeholder="Rédigez votre message..."
            />
            <p className="text-xs text-muted-foreground">
              Le bouton "Laisser un avis" redirigera vers votre fiche Google My Business
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipientEmail}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer la demande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendGoogleReviewModal;
