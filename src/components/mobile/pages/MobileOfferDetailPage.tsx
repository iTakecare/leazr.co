import React, { useState, useEffect } from "react";
import { Loader2, Phone, FileText, BarChart3, StickyNote, ArrowLeft, MoreHorizontal, Calendar, Sparkles } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mobile components
import MobileWorkflowStatus from "../MobileWorkflowStatus";
import MobileFinancialSummary from "../MobileFinancialSummary";
import MobileEquipmentList from "../MobileEquipmentList";
import MobileActionsSheet from "../MobileActionsSheet";
import MobileEquipmentDrawer from "../MobileEquipmentDrawer";
import MobileClientSummaryCard from "../MobileClientSummaryCard";
import MobileBottomNav from "../MobileBottomNav";
import OfferTypeTag from "@/components/offers/OfferTypeTag";
import { getOfferNotes } from "@/services/offers/offerNotes";

// Features
import { CallHistory } from "@/components/offers/CallHistory";
import { CallLogButton } from "@/components/offers/CallLogButton";
import { OfferAISummary } from "@/components/offers/detail/OfferAISummary";
import AmbassadorOfferNotes from "@/components/offers/detail/AmbassadorOfferNotes";
import AmbassadorAddNoteCard from "@/components/offers/detail/AmbassadorAddNoteCard";
import ImprovedOfferHistory from "@/components/offers/detail/ImprovedOfferHistory";

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

// Status labels for mobile pill
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:                   { label: "Brouillon",       cls: "bg-slate-100 text-slate-600" },
  sent:                    { label: "Envoyé",           cls: "bg-blue-100 text-blue-700" },
  internal_docs_requested: { label: "Docs demandés",   cls: "bg-amber-100 text-amber-700" },
  internal_approved:       { label: "Approuvé ITC",    cls: "bg-emerald-100 text-emerald-700" },
  leaser_introduced:       { label: "Chez le leaser",  cls: "bg-violet-100 text-violet-700" },
  leaser_docs_requested:   { label: "Docs leaser",     cls: "bg-orange-100 text-orange-700" },
  leaser_approved:         { label: "Accordé",         cls: "bg-green-100 text-green-700" },
  financed:                { label: "Financé",         cls: "bg-sky-100 text-sky-700" },
  accepted:                { label: "Accepté",         cls: "bg-teal-100 text-teal-700" },
  rejected:                { label: "Rejeté",          cls: "bg-red-100 text-red-600" },
  without_follow_up:       { label: "Sans suite",      cls: "bg-slate-100 text-slate-400" },
};

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
  const [activeTab, setActiveTab] = useState("overview");
  const [offerNotes, setOfferNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Load notes when the notes tab is activated
  useEffect(() => {
    if (activeTab === "notes" && offer?.id && offerNotes.length === 0 && !notesLoading) {
      setNotesLoading(true);
      getOfferNotes(offer.id)
        .then(setOfferNotes)
        .catch(console.error)
        .finally(() => setNotesLoading(false));
    }
  }, [activeTab, offer?.id]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive font-medium text-center">{error || "Offre non trouvée"}</p>
        <Button size="sm" onClick={() => navigateToAdmin("offers")}>Retour aux offres</Button>
      </div>
    );
  }

  // Financials
  const isPurchase = offer.is_purchase === true;
  const equipmentData = offer.equipment_data || [];
  const totals = equipmentData.reduce(
    (acc: any, item: any) => ({
      totalPurchasePrice: acc.totalPurchasePrice + (parseFloat(item.purchase_price) || 0) * (parseInt(item.quantity) || 1),
      totalMonthlyPayment: acc.totalMonthlyPayment + (parseFloat(item.monthly_payment) || 0),
      totalSellingPrice: acc.totalSellingPrice + (parseFloat(item.selling_price) || 0) * (parseInt(item.quantity) || 1),
    }),
    { totalPurchasePrice: 0, totalMonthlyPayment: 0, totalSellingPrice: 0 }
  );
  if (totals.totalPurchasePrice === 0) {
    totals.totalPurchasePrice = offer.amount || 0;
    totals.totalMonthlyPayment = offer.monthly_payment || 0;
  }
  const financedAmount = isPurchase
    ? totals.totalSellingPrice || offer.financed_amount || totals.totalPurchasePrice
    : offer.financed_amount || totals.totalSellingPrice || 0;
  const margin = totals.totalPurchasePrice > 0 ? financedAmount - totals.totalPurchasePrice : 0;
  const marginPercent = totals.totalPurchasePrice > 0 ? (margin / totals.totalPurchasePrice) * 100 : 0;

  const statusInfo = STATUS_CONFIG[offer.workflow_status] ?? { label: offer.workflow_status, cls: "bg-slate-100 text-slate-600" };

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd MMM yyyy", { locale: fr }); }
    catch { return "—"; }
  };

  const handleCallClient = () => {
    const phone = offer.clients?.phone || offer.client_phone;
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleEmailClient = () => {
    const email = offer.client_email || offer.clients?.email;
    if (email) window.location.href = `mailto:${email}`;
  };

  const canReactivate = ["without_follow_up", "rejected", "archived"].includes(offer.workflow_status);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Fixed Header ─────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border safe-top">
        <div className="flex items-center gap-2 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigateToAdmin("offers")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {offer.dossier_number || `#${offer.id?.slice(0, 8)}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">{offer.client_name}</p>
          </div>

          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusInfo.cls}`}>
            {statusInfo.label}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setShowActionsSheet(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="pt-14 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          {/* Tab Bar — sticky below header */}
          <div className="sticky top-14 z-40 bg-background border-b border-border px-2 pt-1">
            <TabsList className="w-full grid grid-cols-4 h-9 bg-transparent p-0 gap-0">
              <TabsTrigger
                value="overview"
                className="flex flex-col items-center gap-0.5 h-9 text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <FileText className="h-3.5 w-3.5" />
                Résumé
              </TabsTrigger>
              <TabsTrigger
                value="calls"
                className="flex flex-col items-center gap-0.5 h-9 text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Phone className="h-3.5 w-3.5" />
                Appels
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex flex-col items-center gap-0.5 h-9 text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <StickyNote className="h-3.5 w-3.5" />
                Notes
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="flex flex-col items-center gap-0.5 h-9 text-[10px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Sparkles className="h-3.5 w-3.5" />
                IA
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Vue d'ensemble ─────────────────────────────────────── */}
          <TabsContent value="overview" className="px-4 space-y-4 mt-4">

            {/* Type tag + dates */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {offer.dossier_number || `#${offer.id?.slice(0, 8)}`}
                    </span>
                  </div>
                  <OfferTypeTag type={offer.type} source={offer.source} partnerName={offer.partner_name} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Créée le {formatDate(offer.created_at)}</span>
                  {offer.duration && <><span className="mx-1">·</span><span>{offer.duration} mois</span></>}
                </div>
                {offer.linkedContract && (
                  <Badge variant="outline" className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
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
              clientPhone={offer.clients?.phone || offer.client_phone}
              onCall={(offer.clients?.phone || offer.client_phone) ? handleCallClient : undefined}
              onEmail={(offer.client_email || offer.clients?.email) ? handleEmailClient : undefined}
            />

            {/* Statut workflow */}
            <MobileWorkflowStatus
              status={offer.workflow_status}
              scores={{ internal: offer.internal_score, leaser: offer.leaser_score }}
            />

            {/* Financier */}
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
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">Coefficient</span>
                      <span className="text-xs font-medium">{offer.coefficient}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              {onSendEmail && (
                <Button variant="outline" size="sm" className="h-10 text-xs" onClick={onSendEmail}>
                  Envoyer par email
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" className="h-10 text-xs" onClick={onEdit}>
                  Modifier
                </Button>
              )}
              {onGeneratePDF && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs col-span-2"
                  onClick={onGeneratePDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Générer PDF
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Appels ─────────────────────────────────────────────── */}
          <TabsContent value="calls" className="px-4 mt-4 space-y-3">
            {/* Quick log button — prominent on mobile */}
            <CallLogButton
              offerId={offer.id}
              variant="default"
              className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"
              onCallLogged={onRefresh}
            />
            {/* History */}
            <CallHistory offerId={offer.id} />
          </TabsContent>

          {/* ── Tab: Notes ──────────────────────────────────────────────── */}
          <TabsContent value="notes" className="px-4 mt-4 space-y-3">
            <AmbassadorAddNoteCard
              offerId={offer.id}
              onNoteAdded={() => {
                // Reload notes after adding
                getOfferNotes(offer.id).then(setOfferNotes).catch(console.error);
              }}
            />
            <AmbassadorOfferNotes notes={offerNotes} loading={notesLoading} />
          </TabsContent>

          {/* ── Tab: IA ─────────────────────────────────────────────────── */}
          <TabsContent value="ai" className="px-4 mt-4">
            <OfferAISummary offerId={offer.id} />
          </TabsContent>
        </Tabs>
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
        onViewPublicLink={() => window.open(`/client/offer/${offer.id}`, "_blank")}
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
