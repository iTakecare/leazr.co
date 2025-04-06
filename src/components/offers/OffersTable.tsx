
import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreHorizontal, 
  Trash2, 
  Send, 
  Eye, 
  FileDown, 
  ExternalLink,
  Building,
  Users,
  User,
  Factory
} from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Offer } from "@/hooks/offers/useFetchOffers";

interface OffersTableProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onResendOffer?: (offerId: string) => void;
  onDownloadPdf?: (offerId: string) => void;
  isUpdatingStatus: boolean;
}

const OffersTable: React.FC<OffersTableProps> = ({
  offers,
  onStatusChange,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf,
  isUpdatingStatus,
}) => {
  const navigate = useNavigate();
  const { isAdmin, isAmbassador } = useAuth();
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  if (!offers.length) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">Aucune offre trouvée.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const handleViewDetails = (offerId: string) => {
    if (isAmbassador()) {
      navigate(`/ambassador/offers/${offerId}`);
    } else {
      navigate(`/offers/${offerId}`);
    }
  };

  const handleSendToClient = async (offerId: string) => {
    await onStatusChange(offerId, "sent");
  };

  const handleCopyOnlineOfferLink = (offerId: string) => {
    const link = generateSignatureLink(offerId);
    navigator.clipboard.writeText(link);
    toast.success("Lien de l'offre en ligne copié dans le presse-papier");
  };

  const openOnlineOffer = (offerId: string) => {
    const link = generateSignatureLink(offerId);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const getOfferTypeBadge = (type: string) => {
    switch(type) {
      case 'ambassador_offer':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>Ambassadeur</span>
          </Badge>
        );
      case 'partner_offer':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Building className="h-3 w-3" />
            <span>Partenaire</span>
          </Badge>
        );
      case 'client_request':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Demande client</span>
          </Badge>
        );
      case 'internal_offer':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <Factory className="h-3 w-3" />
            <span>Interne</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
            <Building className="h-3 w-3" />
            <span>Admin</span>
          </Badge>
        );
    }
  };

  const calculateMargin = (offer: Offer) => {
    if (offer.total_margin_with_difference !== undefined) {
      return offer.total_margin_with_difference;
    }
    
    if (offer.margin !== undefined && offer.margin_difference !== undefined) {
      return offer.margin + offer.margin_difference;
    }
    
    if (offer.margin !== undefined) {
      return offer.margin;
    }
    
    if (offer.financed_amount !== undefined && offer.amount) {
      const margin = offer.financed_amount - offer.amount;
      return margin > 0 ? margin : 0;
    }
    
    if (offer.monthly_payment && offer.coefficient !== undefined) {
      const financedAmount = offer.monthly_payment * (offer.coefficient || 36);
      const margin = financedAmount - (offer.amount || 0);
      return margin > 0 ? margin : 0;
    }
    
    return 0;
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type d'offre</TableHead>
                {!isAmbassador() && (
                  <TableHead className="text-right">Marge</TableHead>
                )}
                {!isAmbassador() && <TableHead className="text-right">Montant financé</TableHead>}
                <TableHead className="text-right">Mensualité</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>{formatDate(offer.created_at)}</TableCell>
                  <TableCell className="font-medium">{offer.client_name}</TableCell>
                  <TableCell>{getOfferTypeBadge(offer.type)}</TableCell>
                  {!isAmbassador() && (
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(calculateMargin(offer))}
                    </TableCell>
                  )}
                  {!isAmbassador() && (
                    <TableCell className="text-right">
                      {formatCurrency(offer.financed_amount)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(offer.monthly_payment)}
                  </TableCell>
                  <TableCell>
                    <OfferStatusBadge status={offer.workflow_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label="Plus d'options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(offer.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        
                        {offer.workflow_status === "draft" && !isAmbassador() && (
                          <DropdownMenuItem
                            onClick={() => handleSendToClient(offer.id)}
                            disabled={isUpdatingStatus}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer au client
                          </DropdownMenuItem>
                        )}
                        
                        {onDownloadPdf && !isAmbassador() && (
                          <DropdownMenuItem onClick={() => onDownloadPdf(offer.id)}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && (
                          <DropdownMenuItem onClick={() => openOnlineOffer(offer.id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Voir offre en ligne
                          </DropdownMenuItem>
                        )}
                        
                        {onResendOffer && offer.workflow_status === "sent" && !isAmbassador() && (
                          <DropdownMenuItem onClick={() => onResendOffer(offer.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Renvoyer
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => setConfirmDelete(offer.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera
              définitivement cette offre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  onDeleteOffer(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OffersTable;
