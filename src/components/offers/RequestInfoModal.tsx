
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FileText, AlertCircle, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { sendDocumentRequestEmail } from "@/services/offers/documentEmail";
import { getOfferById } from "@/services/offerService";
import { updateOfferStatus } from "@/services/offers/offerStatus";

interface RequestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  onSuccess?: () => void;
}

const DOCUMENT_OPTIONS = [
  { id: "balance_sheet", label: "Bilan financier" },
  { id: "provisional_balance", label: "Bilan financier provisoire récent" },
  { id: "tax_notice", label: "Avertissement extrait de rôle (BE)" },
  { id: "tax_return", label: "Liasse fiscale (FR)" },
  { id: "id_card", label: "Carte d'identité nationale (recto-verso)" },
  { id: "company_register", label: "Extrait de registre d'entreprise" },
  { id: "vat_certificate", label: "Attestation TVA" },
  { id: "bank_statement", label: "Relevé bancaire des 3 derniers mois" },
];

const RequestInfoModal: React.FC<RequestInfoModalProps> = ({ 
  isOpen, 
  onClose, 
  offerId,
  onSuccess
}) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [otherDoc, setOtherDoc] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleCheckboxChange = (docId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs(prev => [...prev, docId]);
    } else {
      setSelectedDocs(prev => prev.filter(id => id !== docId));
    }
  };

  const handleSendRequest = async () => {
    if (selectedDocs.length === 0 && !otherDoc.trim()) {
      toast.error("Veuillez sélectionner au moins un document à demander");
      return;
    }

    try {
      setIsSending(true);
      
      // Récupérer les détails de l'offre
      const offer = await getOfferById(offerId);
      if (!offer) {
        throw new Error("Offre non trouvée");
      }

      // Préparer la liste des documents demandés
      const docsToRequest = [
        ...selectedDocs,
        ...(otherDoc.trim() ? [`custom:${otherDoc.trim()}`] : [])
      ];
      
      // Envoyer l'email avec le lien d'upload
      const success = await sendDocumentRequestEmail({
        offerClientEmail: offer.client_email,
        offerClientName: offer.client_name,
        offerId: offerId,
        requestedDocuments: docsToRequest,
        customMessage: customMessage || undefined
      });

      if (!success) {
        throw new Error("Échec de l'envoi de l'email");
      }

      // Mettre à jour le statut de l'offre
      await updateOfferStatus(
        offerId, 
        'info_requested', 
        offer.workflow_status,
        `Documents demandés: ${docsToRequest.join(', ')}`
      );
      
      // Reset form
      setSelectedDocs([]);
      setOtherDoc("");
      setCustomMessage("");
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success("Demande de documents envoyée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-500" />
            Demande de documents administratifs
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les documents à demander au client. Un email avec un lien d'upload sécurisé sera envoyé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {DOCUMENT_OPTIONS.map((doc) => (
              <div key={doc.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`doc-${doc.id}`} 
                  checked={selectedDocs.includes(doc.id)}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(doc.id, checked === true)
                  }
                />
                <label 
                  htmlFor={`doc-${doc.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {doc.label}
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="other-doc" className="text-sm font-medium">
              Autre document (précisez)
            </label>
            <Textarea
              id="other-doc"
              value={otherDoc}
              onChange={(e) => setOtherDoc(e.target.value)}
              placeholder="Ex: Preuve de domicile récente"
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-message" className="text-sm font-medium">
              Message personnalisé (optionnel)
            </label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Message qui sera inclus dans l'email au client..."
              className="resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center text-amber-600 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            L'offre sera mise en attente d'informations
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Annuler
            </Button>
            <Button onClick={handleSendRequest} disabled={isSending}>
              <Mail className="mr-2 h-4 w-4" />
              {isSending ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestInfoModal;
