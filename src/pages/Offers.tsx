
import React, { useEffect } from "react";
import { useOffers } from "@/hooks/useOffers";
import OffersHeader from "@/components/offers/OffersHeader";
import OffersFilter from "@/components/offers/OffersFilter";
import OffersSearch from "@/components/offers/OffersSearch";
import OffersTable from "@/components/offers/OffersTable";
import OffersLoading from "@/components/offers/OffersLoading";
import OffersError from "@/components/offers/OffersError";
import { useLocation, useNavigate } from "react-router-dom";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

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
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus,
    isUpdatingStatus,
    fetchOffers
  } = useOffers();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Vérifier si des filtres sont spécifiés dans l'URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');
    
    if (statusFilter) {
      setActiveTab(statusFilter);
    }
    
    if (typeFilter) {
      setActiveType(typeFilter);
    }
  }, [location.search]);
  
  // Mise à jour de l'URL quand les filtres changent
  useEffect(() => {
    const searchParams = new URLSearchParams();
    
    if (activeTab !== 'all') {
      searchParams.set('status', activeTab);
    }
    
    if (activeType !== 'all') {
      searchParams.set('type', activeType);
    }
    
    const newSearch = searchParams.toString();
    const currentSearch = location.search.startsWith('?') 
      ? location.search.substring(1) 
      : location.search;
    
    if (newSearch !== currentSearch) {
      navigate({ pathname: location.pathname, search: newSearch }, { replace: true });
    }
  }, [activeTab, activeType, navigate, location.pathname, location.search]);

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
        
        <div className="mb-6">
          <OffersFilter 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            activeType={activeType}
            onTypeChange={setActiveType}
          />
        </div>
        
        <div className="mb-6">
          <OffersSearch value={searchTerm} onChange={setSearchTerm} />
        </div>
        
        {loading ? (
          <OffersLoading />
        ) : loadingError ? (
          <OffersError message={loadingError} onRetry={fetchOffers} />
        ) : (
          <OffersTable
            offers={filteredOffers}
            onDeleteOffer={handleDeleteOffer}
            onResendOffer={handleResendOffer}
            onDownloadPdf={handleDownloadPdf}
            onStatusChange={handleUpdateWorkflowStatus}
            isUpdatingStatus={isUpdatingStatus}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Offers;
