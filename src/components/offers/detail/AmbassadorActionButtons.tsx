import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, AlertCircle, FileDown, Copy, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface ActionButtonsProps {
  status: string;
  offerId: string;
  onSendSignatureLink: () => void;
  onDownloadPdf?: () => void;
  onSendPdfEmail?: () => void;
  onFinalizeFinancing?: () => void;
  sendingEmail: boolean;
  isPdfGenerating?: boolean;
  isSendingPdfEmail?: boolean;
  isUpdatingStatus?: boolean;
}

const AmbassadorActionButtons: React.FC<ActionButtonsProps> = ({
  status,
  offerId,
  onSendSignatureLink,
  onDownloadPdf,
  onSendPdfEmail,
  onFinalizeFinancing,
  sendingEmail,
  isPdfGenerating = false,
  isSendingPdfEmail = false,
  isUpdatingStatus = false
}) => {
  const canSendSignature = status === 'draft' || status === 'sent';
  const isCompleted = status === 'approved' || status === 'financed';
  const isSigned = status === 'approved';

  const copySignatureLink = async () => {
    const signatureUrl = `${window.location.origin}/client/offer/${offerId}/sign`;
    try {
      await navigator.clipboard.writeText(signatureUrl);
      toast.success("Lien de signature copié dans le presse-papier");
    } catch (error) {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-600" />
          Actions disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isCompleted ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-medium text-green-800">Offre finalisée</div>
              <div className="text-sm text-green-600">
                {isSigned ? "Signée par le client" : "Processus terminé"}
              </div>
            </div>
            
            {isSigned && onDownloadPdf && (
              <Button 
                onClick={onDownloadPdf}
                disabled={isPdfGenerating}
                className="w-full"
                variant="outline"
              >
                {isPdfGenerating ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></div>
                    Génération du PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Télécharger le PDF signé
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              onClick={onSendSignatureLink}
              disabled={!canSendSignature || sendingEmail}
              className="w-full"
              size="lg"
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer lien de signature
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={copySignatureLink}
              className="w-full"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copier le lien de signature
            </Button>

            {onSendPdfEmail && (
              <Button 
                variant="outline"
                onClick={onSendPdfEmail}
                disabled={isSendingPdfEmail}
                className="w-full"
              >
                {isSendingPdfEmail ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></div>
                    Envoi du PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Envoyer PDF par email
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Bouton pour finaliser le financement quand l'offre est approuvée */}
        {status === 'approved' && onFinalizeFinancing && (
          <Button 
            onClick={onFinalizeFinancing}
            disabled={isUpdatingStatus}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isUpdatingStatus ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                Finalisation en cours...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Finaliser le financement
              </>
            )}
          </Button>
        )}

        {!canSendSignature && !isCompleted && status !== 'approved' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <AlertCircle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm text-orange-700">
              En attente de traitement par l'administration
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorActionButtons;
