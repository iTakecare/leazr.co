
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

interface CompactActionsSidebarProps {
  offer: any;
  onSendEmail: () => void;
  onRequestInfo: () => void;
  onEdit: () => void;
  sendingEmail: boolean;
}

const CompactActionsSidebar: React.FC<CompactActionsSidebarProps> = ({
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Brouillon',
      'sent': 'Envoyée',
      'viewed': 'Vue',
      'signed': 'Signée',
      'approved': 'Approuvée',
      'completed': 'Finalisée',
      'rejected': 'Rejetée'
    };
    return labels[status] || status;
  };

  const canSendEmail = offer.workflow_status === 'draft' || offer.workflow_status === 'sent';
  const canEdit = offer.workflow_status === 'draft';
  const canRequestInfo = ['sent', 'viewed'].includes(offer.workflow_status);

  return (
    <div className="space-y-4">
      {/* Statut de l'offre */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge 
            className={`${getStatusColor(offer.workflow_status)} flex items-center gap-2 text-sm py-2 px-3 w-full justify-center`}
          >
            {getStatusIcon(offer.workflow_status)}
            <span className="truncate">{getStatusLabel(offer.workflow_status)}</span>
          </Badge>
          
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="font-mono">#{offer.id?.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span>Créée:</span>
              <span>{new Date(offer.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {offer.updated_at !== offer.created_at && (
              <div className="flex justify-between">
                <span>Modifiée:</span>
                <span>{new Date(offer.updated_at).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-sm" 
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              <span className="truncate">Modifier</span>
            </Button>
          )}
          
          {canSendEmail && (
            <Button 
              size="sm"
              className="w-full justify-start text-sm" 
              onClick={onSendEmail}
              disabled={sendingEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              <span className="truncate">{sendingEmail ? "Envoi..." : "Envoyer"}</span>
            </Button>
          )}
          
          {canRequestInfo && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-sm"
              onClick={onRequestInfo}
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="truncate">Demander docs</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="truncate">PDF</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            <span className="truncate">Aperçu</span>
          </Button>
        </CardContent>
      </Card>

      {/* Informations signature */}
      {offer.signed_at && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {offer.signer_name && (
                <div className="flex justify-between">
                  <span>Signataire:</span>
                  <span className="font-medium truncate ml-2">{offer.signer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{new Date(offer.signed_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {offer.signer_ip && (
                <div className="flex justify-between">
                  <span>IP:</span>
                  <span className="font-mono">{offer.signer_ip}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompactActionsSidebar;
