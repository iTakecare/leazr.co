import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Mail, Download, AlertCircle } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import { ConditionsEditor } from './ConditionsEditor';
import { useDebouncedPDFGeneration } from '@/hooks/useDebouncedPDFGeneration';
import { OfferPDFData } from './templates/OfferPDFDocument';
import { getOfferById } from '@/services/offers/offerDetail';
import { getOfferEquipment } from '@/services/offers/offerEquipment';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface PDFPreviewEditorProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  pdfType: 'client' | 'internal';
  onSave?: (updatedData: Partial<OfferPDFData>) => Promise<void>;
  onSendEmail?: (pdfBlob: Blob, editedData: Partial<OfferPDFData>) => void;
}

export const PDFPreviewEditor: React.FC<PDFPreviewEditorProps> = ({
  isOpen,
  onClose,
  offerId,
  pdfType,
  onSave,
  onSendEmail,
}) => {
  const [offerData, setOfferData] = useState<OfferPDFData | null>(null);
  const [editedData, setEditedData] = useState<Partial<OfferPDFData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOffer, setIsLoadingOffer] = useState(true);
  const [conditionsOpen, setConditionsOpen] = useState(true);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(true);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);

  // Load offer data when modal opens
  useEffect(() => {
    if (isOpen && offerId) {
      loadOfferData();
    }
  }, [isOpen, offerId]);

  const loadOfferData = async () => {
    setIsLoadingOffer(true);
    try {
      const offer = await getOfferById(offerId);
      if (!offer) {
        toast.error('Offre introuvable');
        onClose();
        return;
      }

      const equipment = await getOfferEquipment(offerId);
      
      const totalMonthlyPayment = equipment.reduce(
        (sum, item) => sum + (item.monthly_payment || 0) * (item.quantity || 1),
        0
      );

      const data: OfferPDFData = {
        id: offer.id,
        offer_number: offer.offer_number || offer.id.slice(0, 8).toUpperCase(),
        offer_date: offer.created_at,
        client_name: offer.client_name || 'Client',
        client_address: offer.client_address || undefined,
        client_email: offer.client_email || undefined,
        client_phone: offer.client_phone || undefined,
        equipment,
        total_monthly_payment: totalMonthlyPayment,
        conditions: offer.conditions || [],
        additional_info: offer.additional_info || undefined,
        company_name: offer.company_name || '',
        company_email: offer.company_email,
        company_phone: offer.company_phone,
      };

      setOfferData(data);
      setEditedData({
        conditions: data.conditions,
        additional_info: data.additional_info,
        client_address: data.client_address,
        client_email: data.client_email,
        client_phone: data.client_phone,
      });
    } catch (error) {
      console.error('[PDFPreviewEditor] Error loading offer:', error);
      toast.error('Erreur lors du chargement de l\'offre');
      onClose();
    } finally {
      setIsLoadingOffer(false);
    }
  };

  const { pdfBlob, isGenerating, error } = useDebouncedPDFGeneration(
    offerId,
    pdfType,
    editedData,
    500
  );

  const handleFieldChange = (field: keyof OfferPDFData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(editedData);
      setHasUnsavedChanges(false);
      toast.success('Modifications enregistrées');
    } catch (error) {
      console.error('[PDFPreviewEditor] Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = () => {
    if (!pdfBlob || !onSendEmail) return;
    onSendEmail(pdfBlob, editedData);
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offre_${pdfType}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('PDF téléchargé');
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer ?')) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Prévisualisation et modification du PDF</span>
              {hasUnsavedChanges && (
                <span className="text-sm text-warning font-normal flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Modifications non enregistrées
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {isLoadingOffer ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Left Panel - PDF Preview */}
                <div className="flex-1 bg-muted/30 p-6 overflow-hidden flex flex-col">
                  <div className="flex-1 bg-background rounded-lg border shadow-sm overflow-hidden relative">
                    {isGenerating && (
                      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-lg flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-medium">Génération en cours...</span>
                      </div>
                    )}
                    {error && (
                      <div className="absolute top-4 right-4 z-10 bg-destructive/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">{error}</span>
                      </div>
                    )}
                    {pdfBlob && (
                      <PDFViewer
                        isOpen={true}
                        onClose={() => {}}
                        pdfBlob={pdfBlob}
                        filename={`offre_${pdfType}.pdf`}
                      />
                    )}
                  </div>
                </div>

                {/* Right Panel - Edit Form */}
                <div className="w-[40%] border-l flex flex-col">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {/* Conditions Section */}
                      <Collapsible open={conditionsOpen} onOpenChange={setConditionsOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full group">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            📝 Conditions générales
                          </h3>
                          <ChevronDown className={`h-5 w-5 transition-transform ${conditionsOpen ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <ConditionsEditor
                            conditions={editedData.conditions || []}
                            onChange={(conditions) => handleFieldChange('conditions', conditions)}
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      {/* Additional Info Section */}
                      <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full group">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            📄 Informations additionnelles
                          </h3>
                          <ChevronDown className={`h-5 w-5 transition-transform ${additionalInfoOpen ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          <Textarea
                            value={editedData.additional_info || ''}
                            onChange={(e) => handleFieldChange('additional_info', e.target.value)}
                            placeholder="Ajoutez des informations complémentaires pour le client..."
                            className="min-h-[120px]"
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      {/* Client Info Section */}
                      <Collapsible open={clientInfoOpen} onOpenChange={setClientInfoOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full group">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            👤 Informations client
                          </h3>
                          <ChevronDown className={`h-5 w-5 transition-transform ${clientInfoOpen ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-4">
                          <div>
                            <Label htmlFor="client_email">Email</Label>
                            <Input
                              id="client_email"
                              type="email"
                              value={editedData.client_email || ''}
                              onChange={(e) => handleFieldChange('client_email', e.target.value)}
                              placeholder="email@client.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="client_phone">Téléphone</Label>
                            <Input
                              id="client_phone"
                              type="tel"
                              value={editedData.client_phone || ''}
                              onChange={(e) => handleFieldChange('client_phone', e.target.value)}
                              placeholder="+33 6 12 34 56 78"
                            />
                          </div>
                          <div>
                            <Label htmlFor="client_address">Adresse</Label>
                            <Textarea
                              id="client_address"
                              value={editedData.client_address || ''}
                              onChange={(e) => handleFieldChange('client_address', e.target.value)}
                              placeholder="Adresse complète du client"
                              className="min-h-[80px]"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      {/* Company Info (Read-only) */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          🏢 Informations entreprise
                        </h3>
                        <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                          <p><strong>Nom :</strong> {offerData?.company_name || '-'}</p>
                          <p><strong>Email :</strong> {offerData?.company_email || '-'}</p>
                          <p><strong>Téléphone :</strong> {offerData?.company_phone || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Footer Actions */}
                  <div className="border-t p-4 flex items-center justify-between gap-2">
                    <Button variant="outline" onClick={handleClose}>
                      Annuler
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDownload}
                        disabled={!pdfBlob || isGenerating}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                      {onSendEmail && (
                        <Button
                          variant="outline"
                          onClick={handleSendEmail}
                          disabled={!pdfBlob || isGenerating}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Envoyer par email
                        </Button>
                      )}
                      {onSave && (
                        <Button
                          onClick={handleSave}
                          disabled={!hasUnsavedChanges || isSaving}
                          className="relative"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Sauvegarder
                          {hasUnsavedChanges && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-warning rounded-full" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
