import React, { useState, useEffect, useMemo } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Grid, List, Filter, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { ExcelExportDialog } from "@/components/offers/ExcelExportDialog";
import { useLocation, useNavigate } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import OffersKanban from "@/components/offers/OffersKanban";
import OffersTable from "@/components/offers/OffersTable";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import OffersKPIStats from "@/components/offers/OffersKPIStats";
import { ExcelImportDialog } from "@/components/excel/ExcelImportDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useAuth } from "@/context/AuthContext";
import { useFetchOfferReminders } from "@/hooks/useFetchOfferReminders";
const Offers = () => {
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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const location = useLocation();
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

  // Forcer la vue liste pour les broker users
  useEffect(() => {
    if (isBrokerUser()) {
      setViewMode('list');
    }
  }, [isBrokerUser]);

  // Référence pour le défilement horizontal
  const scrollContainer = React.useRef<HTMLDivElement>(null);

  // Fonctions pour faire défiler le kanban horizontalement
  const scrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };
  const scrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };
  return <PageTransition>
      <div className="w-full p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <OffersHeader />
          <div className="flex gap-2">
            <ExcelExportDialog offers={offers}>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter Excel
              </Button>
            </ExcelExportDialog>
            <ExcelImportDialog onImportComplete={fetchOffers}>
              <Button variant="outline">
                Importer Excel
              </Button>
            </ExcelImportDialog>
            <Button onClick={() => navigateToAdmin("create-offer")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>
        </div>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
          <OffersFilter activeTab={activeTab} onTabChange={setActiveTab} activeType={activeType} onTypeChange={setActiveType} activeSource={activeSource} onSourceChange={setActiveSource} hideTypeFilter={isBrokerUser()} />
          
          <div className="flex items-center gap-2">
            <OffersSearch value={searchTerm} onChange={setSearchTerm} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-between p-2">
                  <Label htmlFor="show-converted" className="flex items-center cursor-pointer">
                    <span>Inclure les demandes converties</span>
                  </Label>
                  <Switch id="show-converted" checked={includeConverted} onCheckedChange={setIncludeConverted} />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Sélecteur de vue - masqué pour les broker users */}
            {!isBrokerUser() && <div className="flex items-center border rounded-md overflow-hidden">
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-none px-3 bg-muted-foreground">
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
                <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none px-3">
                  <Grid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
              </div>}
          </div>
        </div>
        
        <OffersKPIStats offers={offers} activeKPIFilter={activeKPIFilter} onKPIClick={setActiveKPIFilter} />
        
        {loading ? <OffersLoading /> : loadingError ? <OffersError message={loadingError} onRetry={fetchOffers} /> : viewMode === 'kanban' ? <>
            {/* Contrôles de navigation du Kanban */}
            <div className="flex justify-between items-center mb-2">
              <Button variant="outline" size="icon" onClick={scrollLeft} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={scrollRight} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div ref={scrollContainer} className="overflow-hidden">
              <OffersKanban offers={filteredOffers} onStatusChange={handleUpdateWorkflowStatus} isUpdatingStatus={isUpdatingStatus} onDeleteOffer={handleDeleteOffer} includeConverted={includeConverted} />
            </div>
          </> : <OffersTable offers={filteredOffers} onStatusChange={handleUpdateWorkflowStatus} onDeleteOffer={handleDeleteOffer} onResendOffer={handleResendOffer} onGenerateOffer={handleGenerateOffer} isUpdatingStatus={isUpdatingStatus} sentReminders={reminders} onReminderSent={invalidateReminders} />}
      </div>
    </PageTransition>;
};
export default Offers;