
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

interface ActionButtonsProps {
  status: string;
  onSendEmail: () => void;
  onSendSignatureLink: () => void;
  sendingEmail: boolean;
}

const AmbassadorActionButtons: React.FC<ActionButtonsProps> = ({
  status,
  onSendEmail,
  onSendSignatureLink,
  sendingEmail
}) => {
  const canSendEmail = status === 'draft' || status === 'sent';
  const isCompleted = status === 'approved' || status === 'financed';

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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="font-medium text-green-800">Offre finalisée</div>
            <div className="text-sm text-green-600">Plus d'action requise</div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              onClick={onSendEmail}
              disabled={!canSendEmail || sendingEmail}
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
                  <Mail className="mr-2 h-4 w-4" />
                  {status === 'draft' ? 'Envoyer au client' : 'Renvoyer au client'}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={onSendSignatureLink}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Envoyer lien de signature
            </Button>
          </div>
        )}

        {!canSendEmail && !isCompleted && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <AlertCircle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm text-orange-700">
              Actions limitées pour ce statut
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorActionButtons;
