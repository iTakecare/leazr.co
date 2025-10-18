import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getBusinessSectorLabel } from "@/constants/businessSectors";
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
  FileText, 
  ExternalLink
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OfferStatusBadge from "./OfferStatusBadge";
import OfferTypeTag from "./OfferTypeTag";
import { useAuth } from "@/context/AuthContext";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { toast } from "sonner";
import { calculateOfferMargin, formatMarginDisplay, getEffectiveFinancedAmount, calculateOfferMarginAmount } from "@/utils/marginCalculations";
import { formatAllEquipmentWithQuantities, formatAllEquipmentForCell } from "@/utils/equipmentTooltipFormatter";

interface OffersTableProps {
  offers: any[];
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onResendOffer?: (offerId: string) => void;
  onGenerateOffer?: (offerId: string) => void;
  isUpdatingStatus: boolean;
}

const OffersTable: React.FC<OffersTableProps> = ({
  offers,
  onStatusChange,
  onDeleteOffer,
  onResendOffer,
  onGenerateOffer,
  isUpdatingStatus,
}) => {
  const navigate = useNavigate();
  const { isAdmin, isAmbassador } = useAuth();
  const { navigateToAdmin, navigateToAmbassador } = useRoleNavigation();
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
      return format(new Date(dateString), "dd/MM/yy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };
  
  const handleViewDetails = (offerId: string) => {
    if (isAmbassador()) {
      navigateToAmbassador(`offers/${offerId}`);
    } else {
      navigateToAdmin(`offers/${offerId}`);
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
    navigate(`/client/offer/${offerId}/sign`);
  };

  // Only admins can see the margin column
  const showMarginColumn = isAdmin();
  
  // Check if we have any ambassador offers to show commission column
  const hasAmbassadorOffers = offers.some(offer => offer.type === 'ambassador_offer');

  // Function to calculate and display the margin in euros
  const getDisplayMarginInEuros = (offer: any) => {
    const marginAmount = calculateOfferMarginAmount(offer, offer.offer_equipment);
    return formatCurrency(marginAmount);
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[1400px] text-[11px]">
            <TableHeader>
              <TableRow className="h-9">
                <TableHead className="font-mono text-[10px] w-[110px]">N° Demande</TableHead>
                <TableHead className="text-[10px] w-[75px] hidden lg:table-cell">Date dem.</TableHead>
                <TableHead className="text-[10px] w-[75px] hidden lg:table-cell">Date offre</TableHead>
                <TableHead className="w-[120px] text-[10px]">Client</TableHead>
                <TableHead className="text-[10px] w-[80px] hidden xl:table-cell">Secteur</TableHead>
                <TableHead className="w-[100px] text-[10px] hidden xl:table-cell">Type</TableHead>
                <TableHead className="max-w-[100px] text-[10px] hidden lg:table-cell">Équip.</TableHead>
                <TableHead className="text-[10px] w-[70px] hidden xl:table-cell">Source</TableHead>
                <TableHead className="text-[10px] w-[90px] hidden lg:table-cell">Bailleur</TableHead>
                <TableHead className="text-right text-[10px] w-[90px] hidden xl:table-cell">Mt. achat</TableHead>
                <TableHead className="text-right text-[10px] w-[95px]">Mt. financé</TableHead>
                {showMarginColumn && <TableHead className="text-right text-[10px] w-[80px] hidden lg:table-cell">Marge €</TableHead>}
                {showMarginColumn && <TableHead className="text-right text-[10px] w-[70px] hidden xl:table-cell">Marge %</TableHead>}
                {hasAmbassadorOffers && showMarginColumn && <TableHead className="text-right text-[10px] w-[85px] hidden xl:table-cell">Comm.</TableHead>}
                <TableHead className="text-right text-[10px] w-[85px]">Mensualité</TableHead>
                <TableHead className="text-[10px] w-[90px]">Statut</TableHead>
                <TableHead className="text-right w-[55px] sticky right-0 bg-background text-[10px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id} className="h-10">
                  {/* Numéro de demande */}
                  <TableCell className="font-mono text-[11px] py-2">
                    {offer.dossier_number || '-'}
                  </TableCell>
                  
                  {/* Date demande */}
                  <TableCell className="text-[11px] py-2 hidden lg:table-cell">
                    {offer.request_date ? formatDate(offer.request_date) : '-'}
                  </TableCell>
                  
                  {/* Date de l'offre */}
                  <TableCell className="text-[11px] py-2 hidden lg:table-cell">{formatDate(offer.created_at)}</TableCell>
                  
                  {/* Client */}
                  <TableCell className="font-medium text-[11px] w-[120px] truncate py-2">{offer.client_name}</TableCell>
                  
                  {/* Secteur */}
                  <TableCell className="text-[11px] py-2 hidden xl:table-cell">
                    {offer.business_sector 
                      ? getBusinessSectorLabel(offer.business_sector)
                      : offer.clients?.business_sector 
                        ? getBusinessSectorLabel(offer.clients.business_sector)
                        : '-'
                    }
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell className="w-[100px] text-[11px] py-2 hidden xl:table-cell">
                    <OfferTypeTag type={offer.type} size="sm" />
                  </TableCell>
                  
                  {/* Équipement */}
                  <TableCell className="max-w-[100px] text-[11px] py-2 hidden lg:table-cell">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="truncate cursor-help">
                            {formatAllEquipmentForCell(offer.equipment_description, offer.offer_equipment)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md z-50 bg-popover p-3">
                          <div className="space-y-1">
                            {formatAllEquipmentWithQuantities(offer.equipment_description, offer.offer_equipment).map((line, index) => (
                              <div key={index} className="text-sm font-mono">
                                {line}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  
                  {/* Source */}
                  <TableCell className="text-[11px] py-2 hidden xl:table-cell">
                    {offer.source || '-'}
                  </TableCell>
                  
                  {/* Bailleur */}
                  <TableCell className="text-[11px] py-2 hidden lg:table-cell">
                    {offer.leaser_name || '-'}
                  </TableCell>
                  
                  {/* Montant d'achat */}
                  <TableCell className="text-right text-[11px] py-2 hidden xl:table-cell">
                    <div className="font-medium">
                      {formatCurrency(offer.total_purchase_price || 0)}
                    </div>
                  </TableCell>
                  
                   {/* Montant financé */}
                  <TableCell className="text-right text-[11px] py-2">
                    <div className="font-medium text-blue-600">
                      {formatCurrency(getEffectiveFinancedAmount(offer, offer.offer_equipment))}
                    </div>
                  </TableCell>
                  
                  {/* Marge € - Display margin in euros */}
                  {showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden lg:table-cell">
                      <div className="font-medium text-green-600">
                        {getDisplayMarginInEuros(offer)}
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Marge % - Display margin as percentage */}
                  {showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden xl:table-cell">
                      <div className="font-medium text-green-600">
                        {offer.margin_percentage ? `${offer.margin_percentage.toFixed(1)}%` : '-'}
                      </div>
                    </TableCell>
                  )}
                  {/* Show commission column only for ambassador offers and admins */}
                  {hasAmbassadorOffers && showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden xl:table-cell">
                      {offer.type === 'ambassador_offer' && offer.commission ? (
                        <div className="font-medium text-blue-600">
                          {formatCurrency(offer.commission)}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium text-[11px] py-2">
                    {formatCurrency(offer.monthly_payment)}
                  </TableCell>
                  <TableCell className="text-[11px] py-2">
                    <OfferStatusBadge status={offer.workflow_status} />
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-background py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0"
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
                        
                        {onGenerateOffer && !isAmbassador() && (
                          <DropdownMenuItem onClick={() => onGenerateOffer(offer.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Générer offre
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && (
                          <DropdownMenuItem onClick={() => handleCopyOnlineOfferLink(offer.id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Copier lien public
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && ['sent', 'approved', 'info_requested', 'valid_itc', 'leaser_review', 'financed'].includes(offer.workflow_status) && (
                          <DropdownMenuItem onClick={() => openOnlineOffer(offer.id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Voir offre en ligne
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && offer.workflow_status === 'draft' && (
                          <DropdownMenuItem disabled onClick={() => {}}>
                            <ExternalLink className="mr-2 h-4 w-4 opacity-50" />
                            <span className="text-muted-foreground">Offre non accessible (brouillon)</span>
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
