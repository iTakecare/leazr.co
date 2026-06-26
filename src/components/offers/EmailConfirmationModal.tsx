import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Eye, Trash2, Send, X, Edit } from "lucide-react";
import { toast } from "sonner";
import { getLeasingPdfMetadata, formatFileSize, type PdfMetadata } from "@/services/storageService";
import { getDefaultEmailTemplate } from "@/services/offers/offerEmail";
import { normalizeCommLang, type CommLang } from "@/lib/leasingEmailContent";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerData: any;
  onSendEmailAndValidate: (customContent?: string, includePdf?: boolean, language?: string) => Promise<void>;
  onValidateWithoutEmail: () => Promise<void>;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  onClose,
  offerId,
  offerData,
  onSendEmailAndValidate,
  onValidateWithoutEmail
}) => {
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata | null>(null);
  const [includePdf, setIncludePdf] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customContent, setCustomContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailPreview, setEmailPreview] = useState("");
  const [clientLang, setClientLang] = useState<CommLang>("fr");

  // Langue de communication du client (pour que l'aperçu corresponde à l'envoi).
  useEffect(() => {
    if (!isOpen) return;
    const inline = offerData?.clients?.communication_language;
    if (inline) { setClientLang(normalizeCommLang(inline)); return; }
    const clientId = offerData?.client_id;
    if (!clientId) { setClientLang("fr"); return; }
    let cancelled = false;
    supabase.from("clients").select("communication_language").eq("id", clientId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setClientLang(normalizeCommLang(data?.communication_language)); });
    return () => { cancelled = true; };
  }, [isOpen, offerData]);

  useEffect(() => {
    if (isOpen && offerData?.company_id) {
      loadPdfMetadata();
      generateEmailPreview();
    }
  }, [isOpen, offerData, clientLang]);

  const loadPdfMetadata = async () => {
    if (!offerData?.company_id) return;
    
    setIsLoadingPdf(true);
    try {
      const metadata = await getLeasingPdfMetadata(offerData.company_id);
      setPdfMetadata(metadata);
    } catch (error) {
      console.error("Erreur lors du chargement du PDF:", error);
      toast.error("Impossible de charger les informations du PDF");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const generateEmailPreview = () => {
    if (!offerData) return;

    const clientFirstName = offerData.clients?.first_name || 
                           offerData.clients?.contact_name || 
                           offerData.client_name?.split(' ')[0] || 
                           'Client';

    // Parse equipment SAFELY - strict validation
    let equipmentArray: any[] = [];
    
    console.log('📧 Raw equipment type:', typeof offerData.equipment);
    console.log('📧 Raw equipment value:', offerData.equipment);
    
    if (typeof offerData.equipment === 'string') {
      try {
        const parsed = JSON.parse(offerData.equipment);
        if (Array.isArray(parsed)) {
          equipmentArray = parsed;
          console.log('📧 ✅ Parsed equipment from JSON string:', equipmentArray.length, 'items');
        } else {
          console.error('📧 ❌ Parsed value is not an array:', parsed);
        }
      } catch (e) {
        console.error('📧 ❌ Failed to parse equipment JSON:', e);
      }
    } else if (Array.isArray(offerData.equipment)) {
      equipmentArray = offerData.equipment;
      console.log('📧 ✅ Equipment already an array:', equipmentArray.length, 'items');
    }

    // Build equipment list HTML - STRICT: only title and quantity
    let equipmentListHtml = '';
    
    if (equipmentArray.length > 0) {
      equipmentListHtml = equipmentArray
        .map((item: any) => {
          // Extract ONLY title and quantity
          const title = String(item.title || item.name || 'Équipement');
          const quantity = Number(item.quantity) || 1;
          
          console.log('📧 Processing equipment item:', { title, quantity });
          
          return `<li style="margin-bottom: 8px;">${quantity}x ${title}</li>`;
        })
        .join('');
        
      console.log('📧 ✅ Generated equipment HTML length:', equipmentListHtml.length);
    } else {
      console.warn('📧 ⚠️ No equipment items, using fallback');
      equipmentListHtml = `<li>${offerData.equipment_description || 'Matériel informatique'}</li>`;
    }

    // CRITICAL: Verify no JSON artifacts remain
    if (equipmentListHtml.includes('{') || equipmentListHtml.includes('purchasePrice') || equipmentListHtml.includes('margin')) {
      console.error('📧 ❌ CRITICAL ERROR: JSON artifacts detected in HTML!');
      console.error('📧 Faulty HTML:', equipmentListHtml);
      equipmentListHtml = `<li>${offerData.equipment_description || 'Matériel informatique'}</li>`;
    }

    console.log('📧 Final equipment HTML (validated):', equipmentListHtml);

    const template = getDefaultEmailTemplate(clientFirstName, equipmentListHtml, clientLang);
    setEmailPreview(template);
    setCustomContent(template);
  };

  const handlePreviewPdf = () => {
    if (pdfMetadata?.signedUrl) {
      window.open(pdfMetadata.signedUrl, '_blank');
    }
  };

  const handleRemovePdf = () => {
    if (window.confirm("Êtes-vous sûr de vouloir retirer la pièce jointe du mail ?")) {
      setIncludePdf(false);
      toast.info("La pièce jointe ne sera pas incluse dans l'email");
    }
  };

  const handleSendAndValidate = async () => {
    setIsSending(true);
    try {
      const contentToSend = isEditMode ? customContent : undefined;
      await onSendEmailAndValidate(contentToSend, includePdf, clientLang);
    } finally {
      setIsSending(false);
    }
  };

  const handleValidateWithoutEmail = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir valider l'offre SANS envoyer l'email au client ?")) {
      setIsSending(true);
      try {
        await onValidateWithoutEmail();
      } finally {
        setIsSending(false);
      }
    }
  };

  const sanitizedHtml = DOMPurify.sanitize(isEditMode ? customContent : emailPreview, {
    ALLOWED_TAGS: ['div', 'p', 'br', 'strong', 'em', 'ul', 'li', 'h1', 'h2', 'h3', 'a', 'hr', 'span', 'style', 'meta', 'head', 'body', 'html'],
    ALLOWED_ATTR: ['href', 'style', 'class', 'charset']
  });

  const clientEmail = offerData?.clients?.email || offerData?.client_email || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-[100] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirmation d'envoi d'email de validation
          </DialogTitle>
          <DialogDescription>
            Prévisualisez et personnalisez l'email avant validation de l'offre
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Destinataire */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-1">Destinataire :</p>
            <p className="text-sm text-muted-foreground">{clientEmail}</p>
          </div>

          {/* Langue de l'email */}
          <div>
            <p className="text-sm font-medium mb-1">Langue de l'email</p>
            <Select value={clientLang} onValueChange={(v) => setClientLang(v as CommLang)}>
              <SelectTrigger className="w-full mt-1">
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
              {isLoadingPdf ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Chargement du PDF...</span>
                </div>
              ) : pdfMetadata?.exists ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{pdfMetadata.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(pdfMetadata.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPdf}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Prévisualiser
                    </Button>
                    
                    {includePdf ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemovePdf}
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
                      >
                        Rétablir
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  ⚠️ Aucune pièce jointe trouvée pour cette entreprise
                </div>
              )}
              
              {!includePdf && pdfMetadata?.exists && (
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
              onClick={onClose}
              disabled={isSending}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleValidateWithoutEmail}
                disabled={isSending}
              >
                Valider sans envoyer
              </Button>
              
              <Button
                onClick={handleSendAndValidate}
                disabled={isSending}
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

export default EmailConfirmationModal;
