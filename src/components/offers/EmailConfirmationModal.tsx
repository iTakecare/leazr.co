import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Eye, Trash2, Send, X, Edit } from "lucide-react";
import { toast } from "sonner";
import { getLeasingPdfMetadata, formatFileSize, type PdfMetadata } from "@/services/storageService";
import { getDefaultEmailTemplate } from "@/services/offers/offerEmail";
import DOMPurify from "dompurify";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerData: any;
  onSendEmailAndValidate: (customContent?: string, includePdf?: boolean) => Promise<void>;
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

  useEffect(() => {
    if (isOpen && offerData?.company_id) {
      loadPdfMetadata();
      generateEmailPreview();
    }
  }, [isOpen, offerData]);

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

    // Parse equipment if it's a JSON string
    let equipmentArray = [];
    if (typeof offerData.equipment === 'string') {
      try {
        equipmentArray = JSON.parse(offerData.equipment);
        console.log('📧 Parsed equipment from JSON string:', equipmentArray.length, 'items');
      } catch (e) {
        console.error('📧 Failed to parse equipment:', e);
        equipmentArray = [];
      }
    } else if (Array.isArray(offerData.equipment)) {
      equipmentArray = offerData.equipment;
      console.log('📧 Equipment already array:', equipmentArray.length, 'items');
    }

    // Build equipment list HTML - ONLY extract title and quantity
    let equipmentListHtml = '';
    if (equipmentArray && equipmentArray.length > 0) {
      equipmentListHtml = equipmentArray.map((item: any) => {
        // Extract ONLY title and quantity, ignore ALL other properties
        const title = item.title || item.name || 'Équipement';
        const quantity = item.quantity || 1;
        console.log('📧 Processing equipment:', { title, quantity });
        return `<li style="margin-bottom: 8px;">${quantity}x ${title}</li>`;
      }).join('');
    } else {
      equipmentListHtml = `<li>${offerData.equipment_description || 'Matériel informatique'}</li>`;
    }

    console.log('📧 Final equipment HTML:', equipmentListHtml);

    const template = getDefaultEmailTemplate(clientFirstName, equipmentListHtml);
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
      await onSendEmailAndValidate(contentToSend, includePdf);
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
