
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
    isRequestingInfo,
    isGeneratingPdf,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleGenerateOffer,
    handleRequestInfo,
    handleProcessInfoResponse
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
    isRequestingInfo,
    isGeneratingPdf,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleGenerateOffer,
    handleUpdateWorkflowStatus,
    handleRequestInfo,
    handleProcessInfoResponse,
    refreshOffers: fetchOffers
  };
};
