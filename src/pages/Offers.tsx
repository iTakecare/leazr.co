import React, { useMemo } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import { ExcelExportDialog } from "@/components/offers/ExcelExportDialog";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import OffersTable from "@/components/offers/OffersTable";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import OffersKPIStats from "@/components/offers/OffersKPIStats";
import { ExcelImportDialog } from "@/components/excel/ExcelImportDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useAuth } from "@/context/AuthContext";
import { useFetchOfferReminders } from "@/hooks/useFetchOfferReminders";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileOffersPage } from "@/components/mobile/pages";
const Offers = () => {
  const isMobile = useIsMobile();
  const {
    offers,
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    activeSource,
    setActiveSource,
    activeKPIFilter,
    setActiveKPIFilter,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    isUpdatingStatus,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    handleResendOffer,
    handleGenerateOffer
  } = useOffers();
  const navigate = useNavigate();
  const {
    navigateToAdmin
  } = useRoleNavigation();
  const {
    isBrokerUser
  } = useAuth();

  // Fetch reminders for the table view
  const offerIds = useMemo(() => filteredOffers.map(o => o.id), [filteredOffers]);
  const {
    reminders,
    invalidateReminders
  } = useFetchOfferReminders(offerIds);

  // Mobile rendering
  if (isMobile) {
    return (
      <MobileOffersPage
        offers={filteredOffers}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeType={activeType}
        onTypeChange={setActiveType}
        activeSource={activeSource}
        onSourceChange={setActiveSource}
        onDeleteOffer={handleDeleteOffer}
        onRefresh={fetchOffers}
        includeConverted={includeConverted}
        onIncludeConvertedChange={setIncludeConverted}
      />
    );
  }

  return <PageTransition>
      <div className="w-full p-4 md:p-6">
        {/* En-tête compact : titre + actions sur une ligne */}
        <div className="flex justify-between items-center mb-4">
          <OffersHeader />
          <div className="flex items-center gap-2">
            <OffersSearch value={searchTerm} onChange={setSearchTerm} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-between p-2">
                  <Label htmlFor="show-converted" className="flex items-center cursor-pointer text-sm">
                    <span>Inclure les converties</span>
                  </Label>
                  <Switch id="show-converted" checked={includeConverted} onCheckedChange={setIncludeConverted} />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <ExcelExportDialog offers={offers}>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </ExcelExportDialog>
            <ExcelImportDialog onImportComplete={fetchOffers}>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Importer
              </Button>
            </ExcelImportDialog>
            <Button onClick={() => navigateToAdmin("create-offer")} size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nouvelle demande
            </Button>
          </div>
        </div>

        {/* Filtres sur une seule ligne */}
        <div className="mb-4">
          <OffersFilter activeTab={activeTab} onTabChange={setActiveTab} activeType={activeType} onTypeChange={setActiveType} activeSource={activeSource} onSourceChange={setActiveSource} hideTypeFilter={isBrokerUser()} />
        </div>

        {/* KPI cards */}
        <OffersKPIStats offers={offers} activeKPIFilter={activeKPIFilter} onKPIClick={setActiveKPIFilter} />

        {/* Table */}
        {loading ? <OffersLoading /> : loadingError ? <OffersError message={loadingError} onRetry={fetchOffers} /> : <OffersTable offers={filteredOffers} onStatusChange={handleUpdateWorkflowStatus} onDeleteOffer={handleDeleteOffer} onResendOffer={handleResendOffer} onGenerateOffer={handleGenerateOffer} isUpdatingStatus={isUpdatingStatus} sentReminders={reminders} onReminderSent={invalidateReminders} />}
      </div>
    </PageTransition>;
};
export default Offers;