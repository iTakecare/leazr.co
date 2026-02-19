import React, { useMemo, useState } from "react";
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
import { SortableTableHead } from "@/components/ui/SortableTableHead";
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
import ReminderIndicator from "./ReminderIndicator";
import SendReminderModal from "./SendReminderModal";
import { useAuth } from "@/context/AuthContext";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { EmailOfferDialog } from "./EmailOfferDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculateOfferMargin, formatMarginDisplay, getEffectiveFinancedAmount, calculateOfferMarginAmount, calculateEquipmentTotals } from "@/utils/marginCalculations";
import { formatAllEquipmentWithQuantities, formatAllEquipmentForCell } from "@/utils/equipmentTooltipFormatter";
import { useOffersReminders, ReminderStatus, AllReminders } from "@/hooks/useOfferReminders";
import { OfferReminderRecord } from "@/hooks/useFetchOfferReminders";

type OfferSortColumn = 'dossier_number' | 'date' | 'client' | 'company' | 'type' | 'equipment' | 'source' | 'leaser' | 'purchase_amount' | 'financed_amount' | 'margin_amount' | 'margin_percent' | 'commission' | 'monthly_payment' | 'status' | 'reminder';

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
  sentReminders?: OfferReminderRecord[];
  onReminderSent?: () => void;
}

const OffersTable: React.FC<OffersTableProps> = ({
  offers,
  onStatusChange,
  onDeleteOffer,
  onResendOffer,
  onGenerateOffer,
  isUpdatingStatus,
  sentReminders = [],
  onReminderSent,
}) => {
  const navigate = useNavigate();
  const { isAdmin, isAmbassador } = useAuth();
  const { navigateToAdmin, navigateToAmbassador } = useRoleNavigation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [emailOfferDialog, setEmailOfferDialog] = useState<{
    offerId: string;
    offerNumber: string;
    clientEmail?: string;
    clientName?: string;
    validity?: string;
  } | null>(null);
  
  // State for reminder modal
  const [reminderModalData, setReminderModalData] = useState<{
    offer: any;
    allReminders: AllReminders;
  } | null>(null);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<OfferSortColumn>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const handleSort = (column: OfferSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Calculate reminders for all offers
  const offersReminders = useOffersReminders(offers, sentReminders);

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
      
      const baseFinancedAmount = getEffectiveFinancedAmount(offer, offer.offer_equipment);
      const downPayment = offer.down_payment || 0;
      const effectiveFinancedAmount = downPayment > 0 ? baseFinancedAmount - downPayment : baseFinancedAmount;
      const coefficient = offer.coefficient || 0;
      
      // Recalculer la mensualité si acompte présent
      const adjustedMonthlyPayment = downPayment > 0 && coefficient > 0
        ? (effectiveFinancedAmount * coefficient) / 100
        : offer.monthly_payment;

      // Calcul des valeurs originales (avant remise) pour affichage barré
      const discountAmount = offer.discount_amount || 0;
      const totalsData = calculateEquipmentTotals(offer, offer.offer_equipment);
      const totalPurchasePrice = totalsData.totalPurchasePrice || offer.total_purchase_price || 0;
      
      // Montant financé ORIGINAL (sans remise) = mensualité totale * 100 / coefficient
      const originalFinancedAmount = coefficient > 0 && totalsData.totalMonthlyPayment > 0
        ? (totalsData.totalMonthlyPayment * 100) / coefficient
        : effectiveFinancedAmount;
      const originalMarginInEuros = totalPurchasePrice > 0 ? originalFinancedAmount - totalPurchasePrice : 0;
      const originalMarginPercentage = totalPurchasePrice > 0 ? (originalMarginInEuros / totalPurchasePrice) * 100 : 0;

      return {
        ...offer,
        effectiveFinancedAmount,
        hasDownPayment: downPayment > 0,
        adjustedMonthlyPayment,
        marginInEuros: calculateOfferMarginAmount(offer, offer.offer_equipment),
        discountAmount,
        originalFinancedAmount,
        originalMarginInEuros,
        originalMarginPercentage,
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

  // Sort computed offers
  const sortedOffers = useMemo(() => {
    return [...computedOffers].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'dossier_number':
          comparison = (a.dossier_number || '').localeCompare(b.dossier_number || '', 'fr', { numeric: true });
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'client':
          comparison = (a.clientDisplayName || '').localeCompare(b.clientDisplayName || '', 'fr');
          break;
        case 'company':
          comparison = (a.clientCompanyName || '').localeCompare(b.clientCompanyName || '', 'fr');
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '', 'fr');
          break;
        case 'equipment':
          comparison = (a.equipmentForCell || '').localeCompare(b.equipmentForCell || '', 'fr');
          break;
        case 'source':
          comparison = (a.source || '').localeCompare(b.source || '', 'fr');
          break;
        case 'leaser':
          comparison = (a.leaser_name || '').localeCompare(b.leaser_name || '', 'fr');
          break;
        case 'purchase_amount':
          comparison = (a.total_purchase_price || 0) - (b.total_purchase_price || 0);
          break;
        case 'financed_amount':
          comparison = (a.effectiveFinancedAmount || 0) - (b.effectiveFinancedAmount || 0);
          break;
        case 'margin_amount':
          comparison = (a.marginInEuros || 0) - (b.marginInEuros || 0);
          break;
        case 'margin_percent':
          comparison = (a.margin_percentage || 0) - (b.margin_percentage || 0);
          break;
        case 'commission':
          comparison = (a.commission || 0) - (b.commission || 0);
          break;
        case 'monthly_payment':
          comparison = (a.adjustedMonthlyPayment || 0) - (b.adjustedMonthlyPayment || 0);
          break;
        case 'status':
          comparison = (a.workflow_status || '').localeCompare(b.workflow_status || '', 'fr');
          break;
        case 'reminder':
          const reminderA = offersReminders.get(a.id);
          const reminderB = offersReminders.get(b.id);
          // Sort by level (higher level = more urgent), document reminders first
          const levelA = reminderA?.documentReminder?.level || reminderA?.offerReminder?.level || 0;
          const levelB = reminderB?.documentReminder?.level || reminderB?.offerReminder?.level || 0;
          comparison = levelA - levelB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [computedOffers, sortColumn, sortDirection, offersReminders]);

  if (!sortedOffers.length) {
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
          <Table className={`${isAmbassador() ? 'min-w-[900px]' : 'min-w-[1400px]'} text-[11px]`}>
            <TableHeader>
              <TableRow className="h-9">
                <SortableTableHead
                  column="dossier_number"
                  label="N° Demande"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="font-mono text-[10px] w-[110px]"
                />
                <SortableTableHead
                  column="date"
                  label="Date offre"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-[10px] w-[75px] hidden lg:table-cell"
                />
                <SortableTableHead
                  column="client"
                  label="Client"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[60px] text-[10px]"
                />
                <SortableTableHead
                  column="company"
                  label="Entreprise"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-[10px] w-[100px] hidden lg:table-cell"
                />
                <SortableTableHead
                  column="type"
                  label="Type"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="w-[100px] text-[10px] hidden xl:table-cell"
                />
                <SortableTableHead
                  column="equipment"
                  label="Équip."
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="max-w-[100px] text-[10px] hidden lg:table-cell"
                />
                <SortableTableHead
                  column="source"
                  label="Source"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-[10px] w-[70px] hidden xl:table-cell"
                />
                {!isAmbassador() && (
                  <SortableTableHead
                    column="leaser"
                    label="Bailleur"
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-[10px] w-[90px] hidden lg:table-cell"
                  />
                )}
                {!isAmbassador() && (
                  <SortableTableHead
                    column="purchase_amount"
                    label="Mt. achat"
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-right text-[10px] w-[90px] hidden xl:table-cell"
                  />
                )}
                {!isAmbassador() && (
                  <SortableTableHead
                    column="financed_amount"
                    label="Mt. financé"
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-right text-[10px] w-[95px]"
                  />
                )}
                {showMarginColumn && (
                  <SortableTableHead
                    column="margin_amount"
                    label="Marge €"
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-right text-[10px] w-[80px] hidden lg:table-cell"
                  />
                )}
                {showMarginColumn && (
                  <SortableTableHead
                    column="margin_percent"
                    label="Marge %"
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-right text-[10px] w-[70px] hidden xl:table-cell"
                  />
                )}
                {hasAmbassadorOffers && showMarginColumn && (
                  <SortableTableHead
                    column="commission"
                    label="Comm."
                    currentSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                    className="text-right text-[10px] w-[85px] hidden xl:table-cell"
                  />
                )}
                <SortableTableHead
                  column="monthly_payment"
                  label="Mensualité"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-right text-[10px] w-[85px]"
                />
                <SortableTableHead
                  column="status"
                  label="Statut"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-[10px] w-[90px]"
                />
                <SortableTableHead
                  column="reminder"
                  label="Rappel"
                  currentSort={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="text-[10px] w-[80px]"
                />
                <TableHead className="text-right w-[55px] sticky right-0 bg-background text-[10px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOffers.map((offer) => (
                <TableRow 
                  key={offer.id} 
                  className="h-10 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetails(offer.id)}
                >
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
                  
                  {/* Bailleur - masqué pour les ambassadeurs */}
                  {!isAmbassador() && (
                    <TableCell className="text-[11px] py-2 hidden lg:table-cell">
                      {offer.leaser_name || '-'}
                    </TableCell>
                  )}
                  
                  {/* Montant d'achat - masqué pour les ambassadeurs */}
                  {!isAmbassador() && (
                    <TableCell className="text-right text-[11px] py-2 hidden xl:table-cell">
                      <div className="font-medium">
                        {formatCurrency(offer.total_purchase_price || 0)}
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Montant financé - masqué pour les ambassadeurs */}
                   {!isAmbassador() && (
                    <TableCell className="text-right text-[11px] py-2">
                      <div className="flex flex-col items-end gap-0.5">
                        {offer.discountAmount > 0 ? (
                          <>
                            <span className="text-[10px] text-muted-foreground line-through">
                              {formatCurrency(offer.originalFinancedAmount)}
                            </span>
                            <div className="font-medium text-blue-600 flex items-center gap-1">
                              {formatCurrency(offer.effectiveFinancedAmount)}
                              {offer.hasDownPayment && (
                                <span className="text-amber-500 text-[9px]" title="Acompte déduit">●</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="font-medium text-blue-600 flex items-center gap-1">
                            {formatCurrency(offer.effectiveFinancedAmount)}
                            {offer.hasDownPayment && (
                              <span className="text-amber-500 text-[9px]" title="Acompte déduit">●</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                   {/* Marge € - Display margin in euros */}
                  {showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden lg:table-cell">
                      <div className="flex flex-col items-end gap-0.5">
                        {offer.discountAmount > 0 ? (
                          <>
                            <span className="text-[10px] text-muted-foreground line-through">
                              {formatCurrency(offer.originalMarginInEuros)}
                            </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(offer.marginInEuros)}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-green-600">
                            {formatCurrency(offer.marginInEuros)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                   {/* Marge % - Display margin as percentage */}
                  {showMarginColumn && (
                    <TableCell className="text-right text-[11px] py-2 hidden xl:table-cell">
                      <div className="flex flex-col items-end gap-0.5">
                        {offer.discountAmount > 0 ? (
                          <>
                            <span className="text-[10px] text-muted-foreground line-through">
                              {offer.originalMarginPercentage ? `${offer.originalMarginPercentage.toFixed(1)}%` : '-'}
                            </span>
                            <span className="font-medium text-green-600">
                              {offer.margin_percentage ? `${offer.margin_percentage.toFixed(1)}%` : '-'}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-green-600">
                            {offer.margin_percentage ? `${offer.margin_percentage.toFixed(1)}%` : '-'}
                          </span>
                        )}
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
                    <div className="flex flex-col items-end gap-0.5">
                      {offer.discount_amount && offer.discount_amount > 0 ? (
                        <>
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(offer.monthly_payment_before_discount || (offer.adjustedMonthlyPayment + offer.discount_amount))}
                          </span>
                          <div className="flex items-center gap-1">
                            {formatCurrency(offer.is_purchase ? 0 : (offer.adjustedMonthlyPayment - (offer.monthly_payment_before_discount ? offer.discount_amount : 0)))}
                            <span className="text-blue-500 text-[9px]" title={`Remise ${offer.discount_type === 'percentage' ? offer.discount_value + '%' : formatCurrency(offer.discount_value)}`}>🏷️</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          {formatCurrency(offer.is_purchase ? 0 : offer.adjustedMonthlyPayment)}
                          {offer.hasDownPayment && (
                            <span className="text-amber-500 text-[9px]" title="Mensualité après acompte">●</span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] py-2">
                    <OfferStatusBadge 
                      status={offer.workflow_status} 
                      hasRecentDocuments={offer.has_recent_documents}
                    />
                  </TableCell>
                  
                  {/* Reminder column */}
                  <TableCell className="text-[11px] py-2" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const allReminders = offersReminders.get(offer.id);
                      if (!allReminders || (!allReminders.documentReminder && !allReminders.offerReminder)) {
                        return <span className="text-muted-foreground">-</span>;
                      }
                      return (
                        <ReminderIndicator
                          allReminders={allReminders}
                          compact
                          onClick={() => setReminderModalData({ offer, allReminders })}
                        />
                      );
                    })()}
                  </TableCell>
                  
                  <TableCell className="text-right sticky right-0 bg-background py-2" onClick={(e) => e.stopPropagation()}>
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
      
      {/* Reminder Modal */}
      {reminderModalData && (
        <SendReminderModal
          open={!!reminderModalData}
          onClose={() => setReminderModalData(null)}
          offer={reminderModalData.offer}
          allReminders={reminderModalData.allReminders}
          sentReminders={sentReminders}
          onSuccess={() => {
            setReminderModalData(null);
            onReminderSent?.();
          }}
        />
      )}
    </TooltipProvider>
  );
};

export default OffersTable;
