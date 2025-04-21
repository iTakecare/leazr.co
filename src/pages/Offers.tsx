import React, { useState, useEffect } from "react";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Grid, List, Filter, Search, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Offers = () => {
  const {
    filteredOffers,
    offers,
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
    handleDownloadPdf,
    lastFetchAttempt,
    fetchCount
  } = useOffers();
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [showPermissionsTest, setShowPermissionsTest] = useState(true);
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
    }, 15000);
    
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
                <div className="flex items-center justify-between p-2">
                  <Label htmlFor="show-permissions" className="flex items-center cursor-pointer">
                    <span>Afficher outils diagnostic</span>
                  </Label>
                  <Switch 
                    id="show-permissions"
                    checked={showPermissionsTest}
                    onCheckedChange={setShowPermissionsTest}
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
        
        {showPermissionsTest && (
          <div className="mb-4">
            <PermissionsTest />
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchOffers()}
          className="mb-4 flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser les offres manuellement
          {fetchCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Dernière tentative: {new Date(lastFetchAttempt).toLocaleTimeString()})
            </span>
          )}
        </Button>
        
        {loadingError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur de chargement</AlertTitle>
            <AlertDescription>{loadingError}</AlertDescription>
          </Alert>
        )}
        
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
        
        {!loading && !loadingError && filteredOffers.length === 0 && (
          <div className="bg-muted/20 rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium mb-2">Aucune offre trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {offers.length > 0 
                ? "Aucune offre ne correspond à vos critères de recherche" 
                : "Il n'y a pas encore d'offres dans le système"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setActiveTab('all');
                setActiveType('all');
              }}
              className="mr-2"
            >
              Réinitialiser les filtres
            </Button>
            <Button asChild>
              <Link to="/create-offer">Créer une offre</Link>
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Offers;
