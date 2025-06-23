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
  ExternalLink
} from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { toast } from "sonner";

interface OffersTableProps {
  offers: any[];
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
    // Navigation directe vers la page de signature au lieu d'ouvrir un nouvel onglet
    navigate(`/client/sign-offer/${offerId}`);
  };

  // Only admins can see the margin column
  const showMarginColumn = isAdmin();

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Équipement</TableHead>
                {showMarginColumn && <TableHead className="text-right">Marge</TableHead>}
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
                  <TableCell className="max-w-[180px] truncate">
                    {offer.equipment_description &&
                      typeof offer.equipment_description === "string" &&
                      (offer.equipment_description.startsWith("[") ||
                        offer.equipment_description.startsWith("{"))
                      ? (() => {
                          try {
                            const equipmentData = JSON.parse(
                              offer.equipment_description
                            );
                            if (Array.isArray(equipmentData)) {
                              return equipmentData
                                .map((item) => item.title)
                                .join(", ");
                            }
                            return equipmentData.title || "Équipement sans titre";
                          } catch (e) {
                            return "Format d'équipement non valide";
                          }
                        })()
                      : offer.equipment_description || "Non spécifié"}
                  </TableCell>
                  {/* Show margin column only for admins - Display total_margin_with_difference if available */}
                  {showMarginColumn && (
                    <TableCell className="text-right">
                      <div className="font-medium text-green-600">
                        {offer.total_margin_with_difference 
                          ? formatCurrency(offer.total_margin_with_difference)
                          : offer.margin 
                            ? formatCurrency(offer.margin) 
                            : "N/A"}
                      </div>
                    </TableCell>
                  )}
                  {!isAmbassador() && (
                    <TableCell className="text-right">
                      {offer.financed_amount ? formatCurrency(offer.financed_amount) : 
                        offer.monthly_payment ? formatCurrency((offer.monthly_payment * 100) / (offer.coefficient || 3.27)) : "N/A"}
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
