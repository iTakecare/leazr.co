import React, { useState, useEffect } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Grid, List, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import OffersKanban from "@/components/offers/OffersKanban";
import OffersTable from "@/components/offers/OffersTable";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import PermissionsTest from "@/components/debug/PermissionsTest";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AmbassadorErrorHandler from "@/components/debug/AmbassadorErrorHandler";

const Offers = () => {
  const {
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    isUpdatingStatus,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    handleResendOffer,
    handleDownloadPdf
  } = useOffers();
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const location = useLocation();
  const navigate = useNavigate();
  
  const scrollContainer = React.useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchOffers();
    
    const refreshInterval = setInterval(() => {
      console.log("Rafraîchissement automatique des offres...");
      fetchOffers();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <PageTransition>
      <div className="w-full p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <OffersHeader />
          <Button asChild>
            <Link to="/create-offer" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle offre
            </Link>
          </Button>
        </div>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
          <OffersFilter 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            activeType={activeType}
            onTypeChange={setActiveType}
          />
          
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
                    <span>Inclure les offres converties</span>
                  </Label>
                  <Switch 
                    id="show-converted"
                    checked={includeConverted}
                    onCheckedChange={setIncludeConverted}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')} 
                className="rounded-none px-3"
              >
                <List className="h-4 w-4 mr-2" />
                Liste
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('kanban')} 
                className="rounded-none px-3"
              >
                <Grid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <PermissionsTest />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchOffers()}
          className="mb-4"
        >
          Actualiser les offres manuellement
        </Button>
        
        {loading ? (
          <OffersLoading />
        ) : loadingError ? (
          <div className="space-y-4">
            <OffersError message={loadingError} onRetry={fetchOffers} />
            <AmbassadorErrorHandler 
              message="Erreur lors du chargement des offres. Vérifiez les permissions et la configuration de l'API." 
              onRetry={fetchOffers}
              showDiagnosticInfo={true}
            />
          </div>
        ) : viewMode === 'kanban' ? (
          <>
            <div className="flex justify-between items-center mb-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={scrollLeft}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={scrollRight}
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div ref={scrollContainer} className="overflow-hidden">
              <OffersKanban
                offers={filteredOffers}
                onStatusChange={handleUpdateWorkflowStatus}
                isUpdatingStatus={isUpdatingStatus}
                onDeleteOffer={handleDeleteOffer}
                includeConverted={includeConverted}
              />
            </div>
          </>
        ) : (
          <OffersTable 
            offers={filteredOffers} 
            onStatusChange={handleUpdateWorkflowStatus}
            onDeleteOffer={handleDeleteOffer}
            onResendOffer={handleResendOffer}
            onDownloadPdf={handleDownloadPdf}
            isUpdatingStatus={isUpdatingStatus}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Offers;
