
import React from "react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, RefreshCw, Trash2, Download, Building, Send, CheckCircle, HelpCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Offer } from "@/hooks/offers/useFetchOffers";
import OfferStatusBadge, { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import RequestInfoModal from "./RequestInfoModal";

interface OffersTableProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string, reason?: string) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
  onResendOffer: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  isUpdatingStatus: boolean;
  onRequestInfo?: (offerId: string, requestedDocs: string[], customMessage: string) => Promise<void>;
}

const OffersTable: React.FC<OffersTableProps> = ({
  offers,
  onStatusChange,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf,
  isUpdatingStatus,
  onRequestInfo
}) => {
  const navigate = useNavigate();
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [selectedOffer, setSelectedOffer] = React.useState<Offer | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = React.useState('');
  const [infoRequestDialogOpen, setInfoRequestDialogOpen] = React.useState(false);
  
  const handleRowClick = (offerId: string) => {
    navigate(`/offers/${offerId}`);
  };
  
  const openStatusChangeDialog = (offer: Offer, status: string) => {
    setSelectedOffer(offer);
    setTargetStatus(status);
    setStatusChangeReason('');
    setStatusDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (selectedOffer && targetStatus) {
      await onStatusChange(selectedOffer.id, targetStatus, statusChangeReason);
      setStatusDialogOpen(false);
    }
  };
  
  const openInfoRequestDialog = (offer: Offer) => {
    setSelectedOffer(offer);
    setInfoRequestDialogOpen(true);
  };
  
  const handleInfoRequest = async (requestedDocs: string[], customMessage: string) => {
    if (selectedOffer && onRequestInfo) {
      await onRequestInfo(selectedOffer.id, requestedDocs, customMessage);
      setInfoRequestDialogOpen(false);
    }
  };
  
  const getAvailableActions = (offer: Offer) => {
    const actions = [];
    
    actions.push({
      label: "Voir détails",
      icon: FileText,
      onClick: () => navigate(`/offers/${offer.id}`),
    });
    
    switch (offer.workflow_status) {
      case OFFER_STATUSES.DRAFT.id:
        actions.push({
          label: "Envoyer au client",
          icon: Send,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.SENT.id),
        });
        break;
        
      case OFFER_STATUSES.SENT.id:
        actions.push({
          label: "Marquer comme validée ITC",
          icon: CheckCircle,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.VALID_ITC.id),
        });
        actions.push({
          label: "Renvoyer l'offre",
          icon: RefreshCw,
          onClick: () => onResendOffer(offer.id),
        });
        break;
        
      case OFFER_STATUSES.VALID_ITC.id:
        actions.push({
          label: "Marquer comme approuvée",
          icon: Building,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.APPROVED.id),
        });
        if (onRequestInfo) {
          actions.push({
            label: "Demander des infos",
            icon: HelpCircle,
            onClick: () => openInfoRequestDialog(offer),
          });
        }
        break;
        
      case OFFER_STATUSES.APPROVED.id:
        actions.push({
          label: "Validation bailleur",
          icon: Building,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.LEASER_REVIEW.id),
        });
        break;
        
      case OFFER_STATUSES.LEASER_REVIEW.id:
        actions.push({
          label: "Marquer comme financée",
          icon: RefreshCw,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.FINANCED.id),
        });
        actions.push({
          label: "Rejeter l'offre",
          icon: Trash2,
          onClick: () => openStatusChangeDialog(offer, OFFER_STATUSES.REJECTED.id),
        });
        break;
    }
    
    actions.push({
      label: "Télécharger PDF",
      icon: Download,
      onClick: () => onDownloadPdf(offer.id),
    });
    
    if (!offer.converted_to_contract) {
      actions.push({
        label: "Supprimer",
        icon: Trash2,
        className: "text-red-600 hover:text-red-700",
        onClick: () => onDeleteOffer(offer.id),
      });
    }
    
    return actions;
  };

  if (offers.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-muted-foreground mb-4">Aucune offre trouvée</p>
        <Button asChild>
          <a href="/create-offer">Créer une offre</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => {
              const availableActions = getAvailableActions(offer);
              
              return (
                <TableRow 
                  key={offer.id}
                  className={offer.converted_to_contract ? "bg-green-50/50" : ""}
                >
                  <TableCell 
                    className="font-medium cursor-pointer"
                    onClick={() => handleRowClick(offer.id)}
                  >
                    {`OFF-${offer.id.slice(0, 8)}`}
                    {offer.converted_to_contract && (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        Contrat actif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{offer.client_name}</TableCell>
                  <TableCell>{formatCurrency(offer.amount || 0)}</TableCell>
                  <TableCell>{formatDate(offer.created_at)}</TableCell>
                  <TableCell>
                    <OfferStatusBadge status={offer.workflow_status} isConverted={offer.converted_to_contract} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {availableActions.map((action, index) => (
                          <React.Fragment key={action.label}>
                            {index > 0 && index === availableActions.length - 1 && <DropdownMenuSeparator />}
                            <DropdownMenuItem 
                              onClick={action.onClick}
                              className={action.className}
                              disabled={isUpdatingStatus}
                            >
                              <action.icon className="w-4 h-4 mr-2" />
                              {action.label}
                            </DropdownMenuItem>
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut de l'offre</DialogTitle>
            <DialogDescription>
              {targetStatus === OFFER_STATUSES.REJECTED.id 
                ? "Veuillez indiquer la raison du rejet de cette offre."
                : "Vous pouvez ajouter une note facultative pour ce changement de statut."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder={targetStatus === OFFER_STATUSES.REJECTED.id 
                ? "Raison du rejet..." 
                : "Note (facultatif)..."}
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              rows={4}
              required={targetStatus === OFFER_STATUSES.REJECTED.id}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={targetStatus === OFFER_STATUSES.REJECTED.id && !statusChangeReason.trim()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {onRequestInfo && (
        <RequestInfoModal 
          isOpen={infoRequestDialogOpen}
          onClose={() => setInfoRequestDialogOpen(false)}
          onSendRequest={handleInfoRequest}
          offerId={selectedOffer?.id || ''}
        />
      )}
    </>
  );
};

export default OffersTable;
