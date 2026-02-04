import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Mail,
  ExternalLink,
  Trash2,
  Eye,
  Upload,
  UserX,
  Star
} from "lucide-react";
import ReactivateOfferButton from "./ReactivateOfferButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface CompactActionsSidebarProps {
  offer: any;
  onEdit: () => void;
  onGeneratePDF: () => void;
  onSendEmail: () => void;
  onOpenPublicLink: () => void;
  onDelete: () => void;
  isGeneratingPDF?: boolean;
  onEditRequestDate?: () => void;
  onEditCreatedDate?: () => void;
  uploadLinks?: any[];
  onOpenUploadLink?: () => void;
  onClassifyNoFollowUp?: () => void;
  onStatusUpdated?: () => void;
  onSendGoogleReview?: () => void;
}

const CompactActionsSidebar: React.FC<CompactActionsSidebarProps> = ({
  offer,
  onEdit,
  onGeneratePDF,
  onSendEmail,
  onOpenPublicLink,
  onDelete,
  isGeneratingPDF = false,
  onEditRequestDate,
  onEditCreatedDate,
  uploadLinks,
  onOpenUploadLink,
  onClassifyNoFollowUp,
  onStatusUpdated,
  onSendGoogleReview
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Statuts pour lesquels on peut envoyer une demande d'avis Google
  const googleReviewStatuses = ['validated', 'signed', 'completed', 'financed', 'contract_sent'];
  const canSendGoogleReview = googleReviewStatuses.includes(offer.workflow_status?.toLowerCase());
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
      'internal_review': 'Analyse interne',
      'internal_approved': 'Validée interne',
      'internal_docs_requested': 'Docs demandés interne',
      'internal_rejected': 'Rejetée interne',
      'leaser_review': 'Analyse Leaser',
      'leaser_approved': 'Validée Leaser',
      'leaser_docs_requested': 'Docs demandés Leaser',
      'leaser_rejected': 'Rejetée Leaser',
      'validated': 'Offre validée',
      'viewed': 'Vue',
      'signed': 'Signée',
      'approved': 'Approuvée',
      'completed': 'Finalisée',
      'rejected': 'Rejetée'
    };
    return labels[status] || status;
  };

  // Liste des statuts permettant la modification de l'offre (jusqu'à "introduit leaser")
  const editableStatuses = [
    'draft',
    'sent',
    'offer_send',
    'internal_review',
    'internal_approved',
    'internal_docs_requested',
    'leaser_review',
    'leaser_introduced'
  ];
  const canEdit = editableStatuses.includes(offer.workflow_status?.toLowerCase());

  // Statuts pour lesquels on ne peut pas classer sans suite
  const canClassifyNoFollowUp = ![
    'without_follow_up',
    'internal_rejected',
    'leaser_rejected',
    'validated',
    'financed',
    'signed',
    'completed',
    'contract_sent'
  ].includes(offer.workflow_status?.toLowerCase());

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
            
            {onEditRequestDate && (
              <div className="flex justify-between items-center">
                <span>Demande:</span>
                <div className="flex items-center gap-1">
                  <span>{new Date(offer.request_date || offer.created_at).toLocaleDateString('fr-FR')}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0" 
                    onClick={onEditRequestDate}
                    title="Modifier la date de demande"
                  >
                    <Edit className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </div>
            )}
            
            {onEditCreatedDate && (
              <div className="flex justify-between items-center">
                <span>Créée:</span>
                <div className="flex items-center gap-1">
                  <span>{new Date(offer.created_at).toLocaleDateString('fr-FR')}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0" 
                    onClick={onEditCreatedDate}
                    title="Modifier la date de création"
                  >
                    <Edit className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              </div>
            )}
            
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
              className="w-full justify-start text-sm h-8" 
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              <span>Modifier</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm h-8" 
            onClick={onGeneratePDF}
            disabled={isGeneratingPDF}
          >
            <FileText className="w-4 h-4 mr-2" />
            <span>{isGeneratingPDF ? "Génération..." : "Générer PDF"}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm h-8" 
            onClick={onSendEmail}
          >
            <Mail className="w-4 h-4 mr-2" />
            <span>Envoyer offre par mail</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm h-8" 
            onClick={onOpenPublicLink}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>Ouvrir le lien public</span>
          </Button>
          
          {(offer.internal_score === 'B' || offer.leaser_score === 'B') && onOpenUploadLink && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-sm h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200" 
              onClick={onOpenUploadLink}
            >
              <Upload className="w-4 h-4 mr-2" />
              <span>Accéder à l'upload docs</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start text-sm h-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Supprimer</span>
          </Button>
          
          {/* Bouton Classer sans suite */}
          {canClassifyNoFollowUp && onClassifyNoFollowUp && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-sm h-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300" 
              onClick={onClassifyNoFollowUp}
            >
              <UserX className="w-4 h-4 mr-2" />
              <span>Classer sans suite</span>
            </Button>
          )}
          
          {/* Bouton Envoyer avis Google */}
          {canSendGoogleReview && onSendGoogleReview && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start text-sm h-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-300" 
              onClick={onSendGoogleReview}
            >
              <Star className="w-4 h-4 mr-2" />
              <span>Envoyer avis Google</span>
            </Button>
          )}
          
          {/* Bouton Réactiver le dossier */}
          {onStatusUpdated && (
            <ReactivateOfferButton
              offerId={offer.id}
              currentStatus={offer.workflow_status}
              onStatusUpdated={onStatusUpdated}
              size="sm"
            />
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement cette offre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
