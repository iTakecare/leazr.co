
import { useFetchOffers } from "./offers/useFetchOffers";
import { useOfferFilters } from "./offers/useOfferFilters";
import { useOfferActions } from "./offers/useOfferActions";

export const useOffers = () => {
  const { 
    offers, 
    loading, 
    loadingError, 
    includeConverted, 
    setIncludeConverted, 
    fetchOffers, 
    setOffers 
  } = useFetchOffers();

  const {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    filteredOffers
  } = useOfferFilters(offers);

  const {
    isUpdatingStatus,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleDownloadPdf
  } = useOfferActions(offers, setOffers);

  return {
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
    isUpdatingStatus,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus
  };
};
