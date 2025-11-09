import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateOfferPDF } from '@/services/clientPdfService';

interface EmailOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  offerNumber: string;
  clientEmail?: string;
  clientName?: string;
  validity?: string;
}

export const EmailOfferDialog = ({
  open,
  onOpenChange,
  offerId,
  offerNumber,
  clientEmail = '',
  clientName = '',
  validity = '',
}: EmailOfferDialogProps) => {
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState(`Votre offre de leasing ${offerNumber}`);
  const [message, setMessage] = useState(
    validity 
      ? `Bonjour ${clientName || ''},\n\nVeuillez trouver ci-joint votre offre de leasing n°${offerNumber}.\n\n${validity}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL'équipe iTakecare`
      : `Bonjour ${clientName || ''},\n\nVeuillez trouver ci-joint votre offre de leasing n°${offerNumber}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL'équipe iTakecare`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSending(true);
    try {
      // Generate PDF
      console.log('[EMAIL-OFFER] Generating PDF for offer:', offerId);
      const pdfBlob = await generateOfferPDF(offerId, 'client');
      
      // Convert PDF to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data:application/pdf;base64, prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      console.log('[EMAIL-OFFER] PDF generated, sending email to:', to);

      // Send email via edge function with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: L\'envoi a pris trop de temps')), 30000);
      });

      const sendPromise = supabase.functions.invoke('send-offer-email', {
        body: {
          offerId,
          to,
          subject,
          message,
          pdfBase64,
          pdfFilename: `offre-${offerNumber}.pdf`,
        },
      });

      const { data, error } = await Promise.race([sendPromise, timeoutPromise]);

      if (error) {
        console.error('[EMAIL-OFFER] Edge function error:', error);
        throw new Error(error.message || 'Erreur lors de l\'appel de la fonction d\'envoi');
      }

      // Check response data for errors
      if (data?.error) {
        console.error('[EMAIL-OFFER] Response error:', data.error);
        throw new Error(data.error);
      }

      console.log('[EMAIL-OFFER] Email sent successfully:', data);
      toast.success('Email envoyé avec succès');
      onOpenChange(false);
    } catch (error) {
      console.error('[EMAIL-OFFER] Error:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erreur lors de l\'envoi de l\'email'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer l'offre par email
          </DialogTitle>
          <DialogDescription>
            Le PDF de l'offre sera généré et envoyé en pièce jointe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">
              Destinataire <span className="text-destructive">*</span>
            </Label>
            <Input
              id="to"
              type="email"
              placeholder="client@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">
              Objet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Objet de l'email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Votre message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={8}
              className="resize-none"
            />
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
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
