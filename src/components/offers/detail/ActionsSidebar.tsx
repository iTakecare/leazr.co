
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  FileText, 
  Edit, 
  Eye, 
  Download,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ActionsSidebarProps {
  offer: any;
  onSendEmail: () => void;
  onRequestInfo: () => void;
  onEdit: () => void;
  sendingEmail: boolean;
}

const ActionsSidebar: React.FC<ActionsSidebarProps> = ({
  offer,
  onSendEmail,
  onRequestInfo,
  onEdit,
  sendingEmail
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'sent':
        return <Mail className="w-4 h-4" />;
      case 'viewed':
        return <Eye className="w-4 h-4" />;
      case 'signed':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const canSendEmail = offer.workflow_status === 'draft' || offer.workflow_status === 'sent';
  const canEdit = offer.workflow_status === 'draft';
  const canRequestInfo = ['sent', 'viewed'].includes(offer.workflow_status);

  return (
    <div className="space-y-6">
      {/* Statut de l'offre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge 
            className={`${getStatusColor(offer.workflow_status)} flex items-center gap-2 text-sm py-2 px-3`}
          >
            {getStatusIcon(offer.workflow_status)}
            {offer.workflow_status === 'draft' && 'Brouillon'}
            {offer.workflow_status === 'sent' && 'Envoyée'}
            {offer.workflow_status === 'viewed' && 'Vue par le client'}
            {offer.workflow_status === 'signed' && 'Signée'}
            {offer.workflow_status === 'completed' && 'Finalisée'}
            {offer.workflow_status === 'rejected' && 'Rejetée'}
          </Badge>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>ID:</strong> #{offer.id?.slice(0, 8)}</p>
            <p><strong>Créée:</strong> {new Date(offer.created_at).toLocaleDateString('fr-FR')}</p>
            {offer.updated_at !== offer.created_at && (
              <p><strong>Modifiée:</strong> {new Date(offer.updated_at).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canEdit && (
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier l'offre
            </Button>
          )}
          
          {canSendEmail && (
            <Button 
              className="w-full justify-start" 
              onClick={onSendEmail}
              disabled={sendingEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendingEmail ? "Envoi..." : "Envoyer par email"}
            </Button>
          )}
          
          {canRequestInfo && (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={onRequestInfo}
            >
              <FileText className="w-4 h-4 mr-2" />
              Demander des documents
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Eye className="w-4 h-4 mr-2" />
            Aperçu client
          </Button>
        </CardContent>
      </Card>

      {/* Informations signature */}
      {offer.signed_at && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {offer.signer_name && (
                <p><strong>Signataire:</strong> {offer.signer_name}</p>
              )}
              <p><strong>Date:</strong> {new Date(offer.signed_at).toLocaleString('fr-FR')}</p>
              {offer.signer_ip && (
                <p><strong>IP:</strong> {offer.signer_ip}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActionsSidebar;
