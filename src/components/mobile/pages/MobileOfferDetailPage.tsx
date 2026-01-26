import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

// Mobile components
import MobileDetailHeader from "../MobileDetailHeader";
import MobileWorkflowStatus from "../MobileWorkflowStatus";
import MobileFinancialSummary from "../MobileFinancialSummary";
import MobileEquipmentList from "../MobileEquipmentList";
import MobileQuickActions from "../MobileQuickActions";
import MobileActionsSheet from "../MobileActionsSheet";
import MobileEquipmentDrawer from "../MobileEquipmentDrawer";
import MobileClientSummaryCard from "../MobileClientSummaryCard";
import MobileBottomNav from "../MobileBottomNav";
import OfferTypeTag from "@/components/offers/OfferTypeTag";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, FileText } from "lucide-react";

interface MobileOfferDetailPageProps {
  offer: any;
  leaser?: any;
  loading?: boolean;
  error?: string | null;
  isGeneratingPDF?: boolean;
  onGeneratePDF?: () => void;
  onSendEmail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onRefresh?: () => void;
  onNoFollowUp?: () => void;
  onReactivate?: () => void;
  onEditDates?: () => void;
  companySlug?: string | null;
}

const MobileOfferDetailPage: React.FC<MobileOfferDetailPageProps> = ({
  offer,
  leaser,
  loading = false,
  error,
  isGeneratingPDF = false,
  onGeneratePDF,
  onSendEmail,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
  onNoFollowUp,
  onReactivate,
  onEditDates,
  companySlug,
}) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showEquipmentDrawer, setShowEquipmentDrawer] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de l'offre...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background">
        <MobileDetailHeader
          title="Erreur"
          onBack={() => navigateToAdmin("offers")}
        />
        <div className="pt-14 pb-20 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">
              {error || "Offre non trouvée"}
            </p>
            <button
              onClick={() => navigateToAdmin("offers")}
              className="text-sm text-primary underline"
            >
              Retour aux offres
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate financial totals from equipment
  const calculateTotals = () => {
    const equipmentData = offer.equipment_data || [];
    if (equipmentData.length === 0) {
      return {
        totalPurchasePrice: offer.amount || 0,
        totalMonthlyPayment: offer.monthly_payment || 0,
        totalSellingPrice: offer.financed_amount || 0,
      };
    }

    return equipmentData.reduce(
      (acc: any, item: any) => {
        const purchasePrice = parseFloat(item.purchase_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const monthlyPayment = parseFloat(item.monthly_payment) || 0;
        const marginPercent = parseFloat(item.margin) || 0;
        const sellingPrice =
          parseFloat(item.selling_price) ||
          (purchasePrice > 0 ? purchasePrice * (1 + marginPercent / 100) : 0);

        return {
          totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
          totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
          totalSellingPrice: acc.totalSellingPrice + sellingPrice * quantity,
        };
      },
      { totalPurchasePrice: 0, totalMonthlyPayment: 0, totalSellingPrice: 0 }
    );
  };

  const totals = calculateTotals();
  const isPurchase = offer.is_purchase === true;

  // Calculate financed amount
  const calculateFinancedAmount = () => {
    if (isPurchase) {
      return totals.totalSellingPrice > 0
        ? totals.totalSellingPrice
        : offer.financed_amount || totals.totalPurchasePrice;
    }
    if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
      return (totals.totalMonthlyPayment * 100) / offer.coefficient;
    }
    return offer.financed_amount || totals.totalSellingPrice || 0;
  };

  const financedAmount = calculateFinancedAmount();
  const margin =
    totals.totalPurchasePrice > 0
      ? financedAmount - totals.totalPurchasePrice
      : 0;
  const marginPercent =
    totals.totalPurchasePrice > 0
      ? (margin / totals.totalPurchasePrice) * 100
      : 0;

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };

  // Preview link
  const handlePreview = () => {
    window.open(`/client/offer/${offer.id}`, "_blank");
  };

  // Client actions
  const handleCallClient = () => {
    const phone = offer.clients?.phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmailClient = () => {
    const email = offer.client_email || offer.clients?.email;
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  // Check if offer can be reactivated
  const canReactivate =
    offer.workflow_status === "without_follow_up" ||
    offer.workflow_status === "rejected" ||
    offer.workflow_status === "archived";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MobileDetailHeader
        title={offer.dossier_number || `Offre #${offer.id?.slice(0, 8)}`}
        subtitle={offer.client_name}
        onBack={() => navigateToAdmin("offers")}
        onMoreActions={() => setShowActionsSheet(true)}
      />

      {/* Content */}
      <div className="pt-14 pb-24 px-4 space-y-4">
        {/* Numéro et Type */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {offer.dossier_number || `#${offer.id?.slice(0, 8)}`}
                </span>
              </div>
              <OfferTypeTag
                type={offer.type}
                source={offer.source}
                hasCustomPacks={
                  offer.offer_custom_packs && offer.offer_custom_packs.length > 0
                }
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Créée le {formatDate(offer.created_at)}</span>
              {offer.duration && (
                <>
                  <span className="mx-1">•</span>
                  <span>{offer.duration} mois</span>
                </>
              )}
            </div>
            {/* Contrat lié */}
            {offer.linkedContract && (
              <Badge
                variant="outline"
                className="mt-2 text-xs bg-primary/10 text-primary border-primary/20"
              >
                Contrat: {offer.linkedContract.contract_number || "Lié"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Client */}
        <MobileClientSummaryCard
          clientName={offer.client_name}
          clientCompany={offer.client_company || offer.clients?.company}
          clientEmail={offer.client_email || offer.clients?.email}
          clientPhone={offer.clients?.phone}
          onCall={offer.clients?.phone ? handleCallClient : undefined}
          onEmail={
            offer.client_email || offer.clients?.email
              ? handleEmailClient
              : undefined
          }
        />

        {/* Statut Workflow */}
        <MobileWorkflowStatus
          status={offer.workflow_status}
          scores={{
            internal: offer.internal_score,
            leaser: offer.leaser_score,
          }}
        />

        {/* Résumé Financier */}
        <MobileFinancialSummary
          purchaseAmount={totals.totalPurchasePrice}
          monthlyPayment={totals.totalMonthlyPayment}
          margin={margin}
          marginPercent={marginPercent}
          isPurchase={isPurchase}
          downPayment={offer.down_payment}
          financedAmount={financedAmount}
        />

        {/* Équipements */}
        <MobileEquipmentList
          equipment={offer.equipment_data || []}
          onClick={() => setShowEquipmentDrawer(true)}
        />

        {/* Leaser */}
        {leaser && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leaser</span>
                <span className="font-medium text-sm">{leaser.name}</span>
              </div>
              {offer.coefficient && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    Coefficient
                  </span>
                  <span className="text-xs font-medium">{offer.coefficient}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions Rapides */}
        <MobileQuickActions
          onPDF={onGeneratePDF}
          onEmail={onSendEmail}
          onEdit={onEdit}
          onPreview={handlePreview}
          isGeneratingPDF={isGeneratingPDF}
        />
      </div>

      {/* Bottom Nav */}
      <MobileBottomNav companySlug={companySlug} userRole="admin" />

      {/* Actions Sheet */}
      <MobileActionsSheet
        open={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        offerId={offer.id}
        onDelete={onDelete}
        onNoFollowUp={onNoFollowUp}
        onReactivate={onReactivate}
        onEditDates={onEditDates}
        onViewPublicLink={handlePreview}
        showReactivate={canReactivate}
      />

      {/* Equipment Drawer */}
      <MobileEquipmentDrawer
        open={showEquipmentDrawer}
        onClose={() => setShowEquipmentDrawer(false)}
        equipment={offer.equipment_data || []}
      />
    </div>
  );
};

export default MobileOfferDetailPage;
