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
import { Mail, Loader2, FileText, Eye, Trash2, Send, X, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { updateOfferStatus } from '@/services/offers/offerStatus';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { RichTextEditor } from '@/components/admin/RichTextEditor';


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
  }, [open, offerId]);

  const generatePdfPreview = async () => {
    try {
      setIsGeneratingPdf(true);
      console.log('[EMAIL-OFFER] Generating PDF preview for offer:', offerId);
      
      // Récupérer les données complètes de l'offre depuis la base
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select(`
          *,
          clients (
            id,
            first_name,
            contact_name,
            email,
            phone,
            billing_address,
            billing_city,
            billing_postal_code,
            billing_country
          ),
          companies (
            id,
            name,
            logo_url,
            primary_color,
            secondary_color
          )
        `)
        .eq('id', offerId)
        .single();

      if (offerError || !offerData) {
        throw new Error('Impossible de récupérer les données de l\'offre');
      }

      // Récupérer les équipements
      const { getOfferEquipment } = await import('@/services/offers/offerEquipment');
      const equipmentData = await getOfferEquipment(offerId);

      // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
      const computedTotalMonthly = equipmentData.reduce(
        (sum, eq) => sum + (Number(eq.monthly_payment) || 0),
        0
      );
      console.log('[EMAIL-OFFER] totalMonthly computed from equipment:', computedTotalMonthly);

      // Convertir le logo en Base64
      let companyLogoBase64 = null;
      if (offerData.companies?.logo_url) {
        try {
          const response = await fetch(offerData.companies.logo_url);
          const blob = await response.blob();
          companyLogoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn('⚠️ Erreur chargement logo:', error);
        }
      }

      // Récupérer les logos partenaires
      const { data: partnerLogosData } = await supabase
        .from('company_partner_logos')
        .select('logo_url')
        .eq('company_id', offerData.companies.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Récupérer les valeurs de l'entreprise
      const { data: companyValuesData } = await supabase
        .from('company_values')
        .select('title, description, icon_url')
        .eq('company_id', offerData.companies.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);

      // Récupérer les métriques
      const { data: companyMetricsData } = await supabase
        .from('company_metrics')
        .select('label, value, icon_name')
        .eq('company_id', offerData.companies.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);

      // Récupérer les blocs de contenu texte
      const { data: contentBlocksData } = await supabase
        .from('pdf_content_blocks')
        .select('page_name, block_key, content')
        .eq('company_id', offerData.companies.id);

      const contentBlocksMap: Record<string, Record<string, string>> = {};
      contentBlocksData?.forEach(block => {
        if (!contentBlocksMap[block.page_name]) {
          contentBlocksMap[block.page_name] = {};
        }
        contentBlocksMap[block.page_name][block.block_key] = block.content;
      });

      // Formater l'adresse de facturation
      const billingAddress = offerData.clients ? 
        [
          offerData.clients.billing_address,
          offerData.clients.billing_postal_code,
          offerData.clients.billing_city,
          offerData.clients.billing_country
        ].filter(Boolean).join(', ') 
        : '';

      // Créer un conteneur off-screen pour le rendu
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.background = 'white';
      container.style.zIndex = '-9999';
      container.style.opacity = '0';
      document.body.appendChild(container);

      // Préparer les données pour CommercialOffer
      const isPurchase = (offerData as any)?.is_purchase === true;
      
      // Calculer le total prix de vente pour le mode achat
      const totalSellingPrice = equipmentData.reduce(
        (sum, eq) => sum + (Number((eq as any).selling_price) || 0),
        0
      );
      
      const commercialOfferData = {
        offerNumber: offerData.dossier_number || `OFF-${Date.now().toString().slice(-6)}`,
        offerDate: offerData.created_at ? new Date(offerData.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
        clientName: offerData.client_name || 'Client',
        clientEmail: offerData.client_email || offerData.clients?.email || '',
        clientPhone: offerData.clients?.phone || '',
        clientCompany: (offerData as any).client_company || '',
        clientAddress: billingAddress,
        companyLogo: companyLogoBase64,
        companyName: offerData.companies?.name || 'iTakecare',
        showPrintButton: false,
        isPDFMode: true,
        isPurchase: isPurchase,
        equipment: equipmentData.map((eq: any) => ({
          id: eq.id,
          title: eq.title,
          quantity: eq.quantity || 1,
          monthlyPayment: eq.monthly_payment || 0,
          sellingPrice: eq.selling_price || 0,
          imageUrl: eq.image_url || eq.product?.image_urls?.[0] || eq.product?.image_url || null,
          attributes: eq.attributes?.reduce((acc: any, attr: any) => {
            acc[attr.key] = attr.value;
            return acc;
          }, {}) || {},
          specifications: eq.specifications?.reduce((acc: any, spec: any) => {
            acc[spec.key] = spec.value;
            return acc;
          }, {}) || {}
        })),
        totalMonthly: isPurchase ? 0 : computedTotalMonthly,
        totalSellingPrice: totalSellingPrice,
        contractDuration: Number(offerData.duration) || 36,
        fileFee: isPurchase ? 0 : Number(offerData.file_fee) || 0,
        insuranceCost: isPurchase ? 0 : Number(offerData.annual_insurance) || 0,
        partnerLogos: partnerLogosData?.map(logo => logo.logo_url) || [],
        companyValues: companyValuesData?.map(v => ({
          title: v.title,
          description: v.description,
          iconUrl: v.icon_url,
        })) || [],
        metrics: companyMetricsData?.map(m => ({
          label: m.label,
          value: m.value,
          iconName: m.icon_name,
        })) || [],
        contentBlocks: {
          cover: {
            greeting: contentBlocksMap['cover']?.['greeting'] || '<p>Madame, Monsieur,</p>',
            introduction: contentBlocksMap['cover']?.['introduction'] || '<p>Nous avons le plaisir de vous présenter notre offre commerciale.</p>',
            validity: contentBlocksMap['cover']?.['validity'] || '<p>Cette offre est valable 30 jours.</p>',
          },
          equipment: {
            title: 'Votre sélection d\'équipements professionnels',
            footer_note: contentBlocksMap['equipment']?.['footer_note'] || 'Tous nos équipements sont garantis.',
          },
          conditions: {
            general_conditions: contentBlocksMap['conditions']?.['general_conditions'] || '<h3>Conditions générales</h3>',
            sale_general_conditions: contentBlocksMap['conditions']?.['sale_general_conditions'] || '<h3>Conditions de vente</h3>',
            additional_info: contentBlocksMap['conditions']?.['additional_info'] || '',
            contact_info: contentBlocksMap['conditions']?.['contact_info'] || 'Contactez-nous pour plus d\'informations.',
          },
        },
      };

      // Attendre le chargement des polices
      if ('fonts' in document) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 800));

      container.classList.add('pdf-mode');

      // Rendre le composant
      const root = createRoot(container);
      root.render(
        React.createElement('div', 
          { 
            style: { 
              width: '100%', 
              background: 'white', 
              fontFamily: 'Inter, sans-serif' 
            } 
          },
          React.createElement(CommercialOffer, commercialOfferData)
        )
      );

      // Attendre que tout soit rendu
      await new Promise(resolve => setTimeout(resolve, 3500));

      // Vérifier les pages
      const pages = container.querySelectorAll('.page');
      if (pages.length === 0) {
        throw new Error('Aucune page trouvée');
      }

      // Générer le PDF avec jsPDF et html2canvas
      const { default: JsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const pdf = new JsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      // Créer le Blob
      const pdfBlob = pdf.output('blob');
      setPdfBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      // Nettoyage
      container.classList.remove('pdf-mode');
      root.unmount();
      document.body.removeChild(container);

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

      const validityText = validity 
        ? `<p style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; font-size: 14px;">
             <strong>⏰ Validité:</strong> Cette offre est valable ${validity} jours à compter de ce jour.
           </p>`
        : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Votre offre commerciale est prête
          </h2>
          
          <p style="margin-top: 20px; line-height: 1.6;">
            Bonjour <strong>${firstName}</strong>,
          </p>
          
          <p style="line-height: 1.6;">
            Nous avons le plaisir de vous transmettre votre offre commerciale <strong>${offerNumber}</strong>.
          </p>
          
          ${validityText}
          
          <p style="margin-top: 20px; line-height: 1.6;">
            Vous trouverez ci-joint le détail complet de notre proposition. 
            N'hésitez pas à nous contacter pour toute question, ou marquer votre accord par retour de mail.
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 15px 0; font-size: 12px;"><strong>Cordialement,</strong></p>
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
                    <span style="color: #5CC5CC; font-weight: 600;">Tel direct :</span> <a href="tel:${companyInfo.phone.replace(/\s/g, '')}" style="color: #333; text-decoration: none;">${companyInfo.phone}</a>
                  </div>
                  <div style="margin-bottom: 5px;">
                    <span style="color: #5CC5CC; font-weight: 600;">Mail :</span> <a href="mailto:${companyInfo.email}" style="color: #333; text-decoration: none;">${companyInfo.email}</a>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="color: #5CC5CC; font-weight: 600;">Web :</span> <a href="https://${companyInfo.website}" style="color: #5CC5CC; text-decoration: none;">${companyInfo.website}</a>
                  </div>
                  <div style="font-size: 10px; line-height: 1.6; margin-bottom: 10px; color: #555;">
                    <strong style="color: #333;">Adresse :</strong><br>
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
      // Fallback si erreur - valeurs par défaut
      const validityText = validity 
        ? `<p style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-left: 4px solid #3b82f6; font-size: 14px;">
             <strong>⏰ Validité:</strong> Cette offre est valable ${validity} jours à compter de ce jour.
           </p>`
        : '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Votre offre commerciale est prête
          </h2>
          
          <p style="margin-top: 20px; line-height: 1.6;">
            Bonjour,
          </p>
          
          <p style="line-height: 1.6;">
            Nous avons le plaisir de vous transmettre votre offre commerciale <strong>${offerNumber}</strong>.
          </p>
          
          ${validityText}
          
          <p style="margin-top: 20px; line-height: 1.6;">
            Vous trouverez ci-joint le détail complet de notre proposition. 
            N'hésitez pas à nous contacter pour toute question, ou marquer votre accord par retour de mail.
          </p>
          
          <p style="margin-top: 40px;">Cordialement,<br>L'équipe commerciale</p>
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
          subject: `Votre offre de leasing iTakecare - ${offerNumber}`,
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
