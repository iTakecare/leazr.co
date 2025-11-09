import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2, FileText, Eye, Trash2, Send, X, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateOfferPDF } from '@/services/clientPdfService';
import DOMPurify from 'dompurify';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [customContent, setCustomContent] = useState('');
  const [emailPreview, setEmailPreview] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includePdf, setIncludePdf] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Generate PDF and email preview on modal open
  useEffect(() => {
    if (open) {
      generatePdfPreview();
      generateEmailPreview();
    }
    return () => {
      // Cleanup
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [open, offerId]);

  const generatePdfPreview = async () => {
    setIsGeneratingPdf(true);
    try {
      console.log('[EMAIL-OFFER] Generating PDF preview for offer:', offerId);
      const blob = await generateOfferPDF(offerId, 'client');
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log('[EMAIL-OFFER] PDF preview generated successfully');
    } catch (error) {
      console.error('[EMAIL-OFFER] PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF');
      setPdfBlob(null);
      setPdfUrl(null);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateEmailPreview = () => {
    const preview = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #33638e;">🎉 Félicitations - Votre demande de leasing a été acceptée !</h2>
        <p>Bonjour <strong>${clientName || 'Client'}</strong>,</p>
        <p>Veuillez trouver ci-joint votre offre de leasing n°<strong>${offerNumber}</strong>.</p>
        ${validity ? `<p style="background: #f0f9ff; padding: 12px; border-left: 4px solid #33638e; margin: 20px 0;">
          <strong>⏰ Attention :</strong> ${validity}
        </p>` : ''}
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Cordialement,<br>
          L'équipe iTakecare
        </p>
      </div>
    `;
    setEmailPreview(preview);
    setCustomContent(preview);
  };

  const handleSend = async () => {
    if (!to || !pdfBlob || !includePdf) {
      toast.error('Veuillez vérifier tous les champs obligatoires');
      return;
    }

    setIsSending(true);
    try {
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

      // Use custom content if edited, otherwise use preview
      const messageToSend = customContent || emailPreview;

      console.log('[EMAIL-OFFER] Sending email to:', to);

      // Send email via edge function with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: L\'envoi a pris trop de temps')), 30000);
      });

      const sendPromise = supabase.functions.invoke('send-offer-email', {
        body: {
          offerId,
          to,
          subject: `Votre offre de leasing ${offerNumber}`,
          message: messageToSend,
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

  const handleValidateWithoutSending = () => {
    if (confirm("Fermer sans envoyer l'email ?")) {
      onOpenChange(false);
    }
  };

  const handlePreviewPdf = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleRemovePdf = () => {
    if (confirm("Êtes-vous sûr de vouloir retirer la pièce jointe du mail ?")) {
      setIncludePdf(false);
      toast.info("La pièce jointe ne sera pas incluse dans l'email");
    }
  };

  const sanitizedHtml = DOMPurify.sanitize(customContent || emailPreview, {
    ALLOWED_TAGS: ['div', 'p', 'br', 'strong', 'em', 'ul', 'li', 'h1', 'h2', 'h3', 'a', 'hr', 'span', 'style'],
    ALLOWED_ATTR: ['href', 'style', 'class']
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Envoyer l'offre par email
          </DialogTitle>
          <DialogDescription>
            Prévisualisez et personnalisez l'email avant envoi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Destinataire */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-1">Destinataire :</p>
            <p className="text-sm text-muted-foreground">{to}</p>
          </div>

          {/* Toggle Edit Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              disabled={isSending}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditMode ? "Mode prévisualisation" : "Éditer le contenu"}
            </Button>
          </div>

          {/* Email Content */}
          <div className="border rounded-lg">
            <div className="bg-muted/30 p-3 border-b">
              <p className="text-sm font-medium">Contenu de l'email</p>
            </div>
            
            {isEditMode ? (
              <Textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="min-h-[400px] font-mono text-xs border-0 rounded-t-none"
                placeholder="Contenu HTML de l'email..."
                disabled={isSending}
              />
            ) : (
              <div 
                className="p-4 prose prose-sm max-w-none overflow-auto max-h-[400px]"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            )}
          </div>

          {/* PDF Attachment */}
          <div className="border rounded-lg">
            <div className="bg-muted/30 p-3 border-b">
              <p className="text-sm font-medium">Pièce jointe</p>
            </div>
            
            <div className="p-4">
              {isGeneratingPdf ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Génération du PDF...</span>
                </div>
              ) : pdfBlob ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">offre-{offerNumber}.pdf</p>
                      <p className="text-xs text-muted-foreground">
                        {(pdfBlob.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPdf}
                      disabled={isSending}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Prévisualiser
                    </Button>
                    
                    {includePdf ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemovePdf}
                        disabled={isSending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIncludePdf(true);
                          toast.info("La pièce jointe sera incluse dans l'email");
                        }}
                        disabled={isSending}
                      >
                        Rétablir
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-destructive">
                  ⚠️ Erreur lors de la génération du PDF
                </div>
              )}
              
              {!includePdf && pdfBlob && (
                <div className="mt-2 text-xs text-destructive">
                  ⚠️ La pièce jointe ne sera pas incluse dans l'email
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleValidateWithoutSending}
                disabled={isSending}
              >
                Valider sans envoyer
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={isSending || !includePdf || !pdfBlob}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer l'email et valider
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
