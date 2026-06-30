import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2, FileText, Eye, Trash2, Send, X, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { updateOfferStatus } from '@/services/offers/offerStatus';
import { logOfferEvent } from '@/services/offers/offerEvents';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { offerEmailStrings, normalizeCommLang, type CommLang } from '@/lib/leasingEmailContent';


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
  const [lang, setLang] = useState<CommLang>('fr');

  // Langue de communication du client (pré-sélection du sélecteur).
  useEffect(() => {
    if (!open || !offerId) return;
    let cancelled = false;
    (async () => {
      const { data: offer } = await supabase.from('offers').select('client_id').eq('id', offerId).maybeSingle();
      let resolved: CommLang = 'fr';
      if (offer?.client_id) {
        const { data: client } = await supabase.from('clients').select('communication_language').eq('id', offer.client_id).maybeSingle();
        resolved = normalizeCommLang(client?.communication_language);
      }
      if (!cancelled) setLang(resolved);
    })();
    return () => { cancelled = true; };
  }, [open, offerId]);

  // Generate PDF and email preview on modal open / language change
  useEffect(() => {
    if (open && offerId) {
      setTo(clientEmail);
      generatePdfPreview();
      generateEmailPreview().then(preview => {
        setEmailPreview(preview);
        setCustomContent(preview);
      });
    }
    return () => {
      // Cleanup
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offerId, lang]);

  const generatePdfPreview = async () => {
    try {
      setIsGeneratingPdf(true);
      // Moteur de rendu PDF unique (cf. commercialOfferPdfService).
      const { generateCommercialOfferPDF } = await import('@/services/commercialOfferPdfService');
      const blob = await generateCommercialOfferPDF(offerId);
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
      console.log('[EMAIL-OFFER] PDF preview generated successfully');
    } catch (error) {
      console.error('[EMAIL-OFFER] Error generating PDF preview:', error);
      toast.error('Erreur lors de la génération du PDF');
      setPdfBlob(null);
      setPdfUrl(null);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateEmailPreview = async () => {
    try {
      // Récupérer les données de l'offre avec l'entreprise
      const { data: offerData } = await supabase
        .from('offers')
        .select(`
          client_name,
          clients (
            first_name,
            contact_name
          ),
          companies (
            id,
            name,
            logo_url
          )
        `)
        .eq('id', offerId)
        .single();

      // Valeurs par défaut pour l'entreprise
      let companyInfo = {
        name: 'iTakecare SRL',
        logo_url: '/leazr-logo.png',
        email: 'hello@itakecare.be',
        phone: '+32 71 49 16 85',
        address: 'Avenue du Général Michel 1E',
        city: 'Charleroi',
        postal_code: '6000',
        vat_number: 'BE0795.642.894',
        website: 'www.itakecare.be',
        slogan: 'Leasing de pack informatique simple, économique et éco-responsable pour PME et startup'
      };

      // Récupérer les informations de contact de l'entreprise
      if (offerData?.companies?.id) {
        const { data: customization } = await supabase
          .from('company_customizations')
          .select('company_email, company_phone, company_address, company_city, company_postal_code, company_vat_number')
          .eq('company_id', offerData.companies.id)
          .single();
        
        if (customization || offerData.companies) {
          companyInfo = {
            name: offerData.companies.name || companyInfo.name,
            logo_url: offerData.companies.logo_url || companyInfo.logo_url,
            email: customization?.company_email || companyInfo.email,
            phone: customization?.company_phone || companyInfo.phone,
            address: customization?.company_address || companyInfo.address,
            city: customization?.company_city || companyInfo.city,
            postal_code: customization?.company_postal_code || companyInfo.postal_code,
            vat_number: customization?.company_vat_number || companyInfo.vat_number,
            website: companyInfo.website,
            slogan: companyInfo.slogan
          };
        }
      }

      // Extraire le prénom
      let firstName = 'Client';
      if (offerData?.clients?.first_name) {
        firstName = offerData.clients.first_name;
      } else if (offerData?.clients?.contact_name) {
        firstName = offerData.clients.contact_name.split(' ')[0];
      } else if (offerData?.client_name) {
        firstName = offerData.client_name.split(' ')[0];
      }

      const t = offerEmailStrings(lang);
      const validityText = validity
        ? `<p style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; font-size: 14px;">
             ${t.validity(validity)}
           </p>`
        : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            ${t.title}
          </h2>

          <p style="margin-top: 20px; line-height: 1.6;">
            ${t.greeting(firstName)}
          </p>

          <p style="line-height: 1.6;">
            ${t.intro(offerNumber)}
          </p>

          ${validityText}

          <p style="margin-top: 20px; line-height: 1.6;">
            ${t.closing}
          </p>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 15px 0; font-size: 12px;"><strong>${t.regards}</strong></p>
            <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 11px; color: #333; width: 100%; max-width: 650px;">
              <tr>
                <td style="vertical-align: top; padding-right: 20px; border-right: 2px solid #ddd; width: 45%;">
                  <div style="margin-bottom: 12px;">
                    <img src="${companyInfo.logo_url}" alt="${companyInfo.name}" style="height: 40px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none'">
                  </div>
                  <div style="font-weight: bold; color: #1e40af; font-size: 13px; margin-bottom: 10px;">
                    ${companyInfo.name}
                  </div>
                  <div style="color: #5CC5CC; font-size: 10px; line-height: 1.5; font-style: italic;">
                    ${companyInfo.slogan}
                  </div>
                </td>
                <td style="vertical-align: top; padding-left: 20px; width: 55%;">
                  <div style="margin-bottom: 5px;">
                    <span style="color: #5CC5CC; font-weight: 600;">${t.labelTel}</span> <a href="tel:${companyInfo.phone.replace(/\s/g, '')}" style="color: #333; text-decoration: none;">${companyInfo.phone}</a>
                  </div>
                  <div style="margin-bottom: 5px;">
                    <span style="color: #5CC5CC; font-weight: 600;">${t.labelMail}</span> <a href="mailto:${companyInfo.email}" style="color: #333; text-decoration: none;">${companyInfo.email}</a>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="color: #5CC5CC; font-weight: 600;">${t.labelWeb}</span> <a href="https://${companyInfo.website}" style="color: #5CC5CC; text-decoration: none;">${companyInfo.website}</a>
                  </div>
                  <div style="font-size: 10px; line-height: 1.6; margin-bottom: 10px; color: #555;">
                    <strong style="color: #333;">${t.labelAddress}</strong><br>
                    ${companyInfo.name}<br>
                    ${companyInfo.address}<br>
                    BE-${companyInfo.postal_code} ${companyInfo.city}<br>
                    TVA : ${companyInfo.vat_number}
                  </div>
                  <div style="margin-top: 10px;">
                    <a href="https://www.facebook.com/itakecarebe" style="margin-right: 10px; display: inline-block;">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 22px; height: 22px; vertical-align: middle;">
                    </a>
                    <a href="https://www.linkedin.com/company/itakecare" style="display: inline-block;">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733561.png" alt="LinkedIn" style="width: 22px; height: 22px; vertical-align: middle;">
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('[EMAIL-OFFER] Error generating email preview:', error);
      // Fallback si erreur - valeurs par défaut (localisées)
      const t = offerEmailStrings(lang);
      const validityText = validity
        ? `<p style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; font-size: 14px;">
             ${t.validity(validity)}
           </p>`
        : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            ${t.title}
          </h2>

          <p style="margin-top: 20px; line-height: 1.6;">
            ${t.greetingNoName}
          </p>

          <p style="line-height: 1.6;">
            ${t.intro(offerNumber)}
          </p>

          ${validityText}

          <p style="margin-top: 20px; line-height: 1.6;">
            ${t.closing}
          </p>

          <p style="margin-top: 40px;">${t.regards}<br>${t.teamFallback}</p>
        </div>
      `;
    }
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
          subject: offerEmailStrings(lang).subject(offerNumber),
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

      if (data?.error) {
        console.error('[EMAIL-OFFER] Response error:', data.error);
        throw new Error(data.error);
      }

      console.log('[EMAIL-OFFER] Email sent successfully:', data);
      logOfferEvent(offerId, 'email_offer', `Offre envoyée par e-mail à ${to}`);

      // Mettre à jour le workflow_status vers 'sent'
      console.log('[EMAIL-OFFER] Updating workflow status to "sent"...');
      try {
        const statusUpdated = await updateOfferStatus(
          offerId,
          'sent',
          null,
          'Email envoyé au client'
        );
        
        if (statusUpdated) {
          console.log('[EMAIL-OFFER] Workflow status updated to "sent"');
        } else {
          console.warn('[EMAIL-OFFER] Failed to update workflow status');
        }
      } catch (statusError) {
        console.error('[EMAIL-OFFER] Error updating workflow status:', statusError);
      }

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

  const sanitizedHtml = DOMPurify.sanitize(emailPreview, {
    ALLOWED_TAGS: ['div', 'p', 'br', 'strong', 'em', 'ul', 'li', 'h1', 'h2', 'h3', 'a', 'hr', 'span'],
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

          {/* Langue de l'email */}
          <div>
            <p className="text-sm font-medium mb-1">Langue de l'email</p>
            <Select value={lang} onValueChange={(v) => setLang(v as CommLang)} disabled={isSending}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[110] bg-background shadow-md border">
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
              </SelectContent>
            </Select>
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
              <div className="p-2">
                <RichTextEditor
                  value={customContent}
                  onChange={setCustomContent}
                  placeholder="Personnalisez votre message..."
                />
              </div>
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
                  Envoyer l'email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
