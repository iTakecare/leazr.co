import React, { useMemo } from "react";
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
  ExternalLink,
  Mail,
  Upload
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
import { EmailOfferDialog } from "./EmailOfferDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculateOfferMargin, formatMarginDisplay, getEffectiveFinancedAmount, calculateOfferMarginAmount } from "@/utils/marginCalculations";
import { formatAllEquipmentWithQuantities, formatAllEquipmentForCell } from "@/utils/equipmentTooltipFormatter";

// Fonction pour extraire le nom et l'entreprise depuis client_name
const parseClientName = (clientName: string, clientsData?: any) => {
  // Si on a le nom de l'entreprise via clients.company, l'utiliser
  if (clientsData?.company) {
    return {
      displayName: clientName.split(' - ')[0].trim(),
      companyName: clientsData.company
    };
  }
  
  // Sinon parser depuis client_name
  if (clientName.includes(' - ')) {
    const parts = clientName.split(' - ');
    return {
      displayName: parts[0].trim(),
      companyName: parts.slice(1).join(' - ').trim()
    };
  }
  
  // Pas d'entreprise trouvée
  return {
    displayName: clientName,
    companyName: null
  };
};

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
  const [emailOfferDialog, setEmailOfferDialog] = React.useState<{
    offerId: string;
    offerNumber: string;
    clientEmail?: string;
    clientName?: string;
    validity?: string;
  } | null>(null);

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
    const link = generateSignatureLink(offerId);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleOpenUploadLink = async (offerId: string) => {
    try {
      // Importer les services nécessaires
      const { useOfferDocuments } = await import("@/hooks/useOfferDocuments");
      
      // Récupérer les upload links pour cette offre
      const { data: uploadLinks, error } = await supabase
        .from('offer_upload_links')
        .select('*')
        .eq('offer_id', offerId)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Erreur lors de la récupération des liens d'upload:", error);
        toast.error("Impossible de récupérer le lien d'upload");
        return;
      }

      // Si un lien existe, l'ouvrir
      if (uploadLinks && uploadLinks.length > 0) {
        window.open(`/offer/documents/upload/${uploadLinks[0].token}`, '_blank');
        return;
      }

      // Sinon créer un nouveau lien
      const { createUploadLink } = await import("@/services/offers/offerDocuments");
      const token = await createUploadLink(
        offerId,
        ['balance_sheet', 'id_card_front', 'id_card_back'],
        'Lien généré par l\'administrateur'
      );

      if (token) {
        window.open(`/offer/documents/upload/${token}`, '_blank');
        toast.success("Lien d'upload généré avec succès");
      } else {
        toast.error("Impossible de générer le lien d'upload");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'accès au lien d'upload");
    }
  };

  // Memoize computed data for all offers to avoid recalculating on every render
  const computedOffers = useMemo(() => {
    return offers.map(offer => {
      const { displayName, companyName } = parseClientName(offer.client_name, offer.clients);
      
      return {
        ...offer,
        effectiveFinancedAmount: (offer.down_payment || 0) > 0 
          ? getEffectiveFinancedAmount(offer, offer.offer_equipment) - (offer.down_payment || 0)
          : getEffectiveFinancedAmount(offer, offer.offer_equipment),
        hasDownPayment: (offer.down_payment || 0) > 0,
        marginInEuros: calculateOfferMarginAmount(offer, offer.offer_equipment),
        equipmentForCell: formatAllEquipmentForCell(offer.equipment_description, offer.offer_equipment),
        equipmentWithQuantities: formatAllEquipmentWithQuantities(offer.equipment_description, offer.offer_equipment),
        businessSectorLabel: offer.business_sector 
          ? getBusinessSectorLabel(offer.business_sector)
          : offer.clients?.business_sector 
            ? getBusinessSectorLabel(offer.clients.business_sector)
            : '-',
        clientDisplayName: displayName,
        clientCompanyName: companyName
      };
    });
  }, [offers]);

  // Only admins can see the margin column
  const showMarginColumn = useMemo(() => isAdmin(), [isAdmin]);
  
  // Check if we have any ambassador offers to show commission column
  const hasAmbassadorOffers = useMemo(() => 
    computedOffers.some(offer => offer.type === 'ambassador_offer'),
    [computedOffers]
  );

  if (!computedOffers.length) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">Aucune offre trouvée.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[1400px] text-[11px]">
            <TableHeader>
              <TableRow className="h-9">
                <TableHead className="font-mono text-[10px] w-[110px]">N° Demande</TableHead>
                <TableHead className="text-[10px] w-[75px] hidden lg:table-cell">Date offre</TableHead>
                <TableHead className="w-[60px] text-[10px]">Client</TableHead>
                <TableHead className="text-[10px] w-[100px] hidden lg:table-cell">Entreprise</TableHead>
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
              {computedOffers.map((offer) => (
                <TableRow key={offer.id} className="h-10">
                  {/* Numéro de demande */}
                  <TableCell className="font-mono text-[11px] py-2">
                    {offer.dossier_number || '-'}
                  </TableCell>
                  
                  {/* Date de l'offre */}
                  <TableCell className="text-[11px] py-2 hidden lg:table-cell">{formatDate(offer.created_at)}</TableCell>
                  
                  {/* Client */}
                  <TableCell className="text-[11px] w-[60px] py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate cursor-help font-medium">
                          {offer.clientDisplayName}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md z-50 bg-popover">
                        <div className="text-sm font-medium">
                          {offer.clientDisplayName}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  
                  {/* Entreprise */}
                  <TableCell className="text-[11px] py-2 hidden lg:table-cell">
                    {offer.clientCompanyName || '-'}
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell className="w-[100px] text-[11px] py-2 hidden xl:table-cell">
                    <OfferTypeTag 
                      type={offer.type} 
                      source={offer.source} 
                      hasCustomPacks={offer.offer_custom_packs && offer.offer_custom_packs.length > 0}
                      size="sm" 
                    />
                  </TableCell>
                  
                  {/* Équipement */}
                  <TableCell className="max-w-[100px] text-[11px] py-2 hidden lg:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate cursor-help">
                          {offer.equipmentForCell}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md z-50 bg-popover p-3">
                        <div className="space-y-1">
                          {offer.equipmentWithQuantities.map((line: string, index: number) => (
                            <div key={index} className="text-sm font-mono">
                              {line}
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  
                  {/* Source */}
                  <TableCell className="text-[11px] py-2 hidden xl:table-cell">
                    {offer.source ? (
                      <OfferTypeTag 
                        type="" 
                        source={offer.source} 
                        hasCustomPacks={offer.offer_custom_packs && offer.offer_custom_packs.length > 0}
                        size="sm" 
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
                    <div className="font-medium text-blue-600 flex items-center justify-end gap-1">
                      {formatCurrency(offer.effectiveFinancedAmount)}
                      {offer.hasDownPayment && (
                        <span className="text-amber-500 text-[9px]" title="Acompte déduit">●</span>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Marge € - Display margin in euros */}
                  {showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden lg:table-cell">
                      <div className="font-medium text-green-600">
                        {formatCurrency(offer.marginInEuros)}
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
                    {formatCurrency(offer.is_purchase ? 0 : offer.monthly_payment)}
                  </TableCell>
                  <TableCell className="text-[11px] py-2">
                    <OfferStatusBadge 
                      status={offer.workflow_status} 
                      hasRecentDocuments={offer.has_recent_documents}
                    />
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
                        
                        {onGenerateOffer && !isAmbassador() && (
                          <DropdownMenuItem onClick={() => onGenerateOffer(offer.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Générer PDF
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && (
                          <DropdownMenuItem onClick={() => setEmailOfferDialog({
                            offerId: offer.id,
                            offerNumber: offer.offer_number,
                            clientEmail: offer.clients?.email,
                            clientName: `${offer.clients?.first_name || ''} ${offer.clients?.last_name || ''}`.trim(),
                            validity: offer.content_blocks?.cover_validity,
                          })}>
                            <Mail className="mr-2 h-4 w-4" />
                            Envoyer offre par mail
                          </DropdownMenuItem>
                        )}
                        
                        {!isAmbassador() && (
                          <DropdownMenuItem onClick={() => openOnlineOffer(offer.id)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ouvrir le lien public
                          </DropdownMenuItem>
                        )}

                        {!isAmbassador() && (offer.internal_score === 'B' || offer.leaser_score === 'B') && (
                          <DropdownMenuItem onClick={() => handleOpenUploadLink(offer.id)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Accéder à l'upload docs
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

      {emailOfferDialog && (
        <EmailOfferDialog
          open={!!emailOfferDialog}
          onOpenChange={(open) => !open && setEmailOfferDialog(null)}
          offerId={emailOfferDialog.offerId}
          offerNumber={emailOfferDialog.offerNumber}
          clientEmail={emailOfferDialog.clientEmail}
          clientName={emailOfferDialog.clientName}
          validity={emailOfferDialog.validity}
        />
      )}
    </TooltipProvider>
  );
};

export default OffersTable;
