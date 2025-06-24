
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Copy, 
  FileDown, 
  Eye, 
  ExternalLink,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface QuickActionsCardProps {
  offerId: string;
  status: string;
  shareUrl: string;
  signatureUrl: string;
  onSendToClient: () => void;
  onDownloadPdf: () => void;
  isPrintingPdf: boolean;
  isSending: boolean;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  offerId,
  status,
  shareUrl,
  signatureUrl,
  onSendToClient,
  onDownloadPdf,
  isPrintingPdf,
  isSending
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedSignature, setCopiedSignature] = useState(false);

  const copyToClipboard = async (text: string, type: 'share' | 'signature') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'share') {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } else {
        setCopiedSignature(true);
        setTimeout(() => setCopiedSignature(false), 2000);
      }
      
      toast.success("Lien copié dans le presse-papier");
    } catch (error) {
      toast.error("Impossible de copier le lien");
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  const canSendToClient = status === 'draft' || status === 'sent';
  const isSigned = status === 'approved';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-purple-600" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action principale */}
        <div className="space-y-2">
          {canSendToClient ? (
            <Button 
              onClick={onSendToClient}
              disabled={isSending}
              className="w-full"
              size="lg"
            >
              {isSending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {status === 'draft' ? 'Envoyer au client' : 'Renvoyer au client'}
                </>
              )}
            </Button>
          ) : isSigned ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-medium text-green-800">Offre signée par le client</div>
              <div className="text-sm text-green-600">Plus d'action requise</div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">
                Aucune action disponible pour ce statut
              </div>
            </div>
          )}
        </div>

        {/* Actions secondaires */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Liens de partage</div>
          
          {/* Lien de consultation */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => copyToClipboard(shareUrl, 'share')}
            >
              {copiedShare ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedShare ? 'Copié!' : 'Copier lien'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(shareUrl)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Lien de signature */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => copyToClipboard(signatureUrl, 'signature')}
            >
              {copiedSignature ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedSignature ? 'Copié!' : 'Copier signature'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(signatureUrl)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Téléchargement PDF */}
        <Button
          variant="outline"
          onClick={onDownloadPdf}
          disabled={isPrintingPdf}
          className="w-full"
        >
          {isPrintingPdf ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></div>
              Génération...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Télécharger PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;
