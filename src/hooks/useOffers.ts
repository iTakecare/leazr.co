
import { useFetchOffers } from "./offers/useFetchOffers";
import { useOfferFilters } from "./offers/useOfferFilters";
import { useOfferActions } from "./offers/useOfferActions";
import { useCallback } from "react";

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
    handleDownloadPdf,
    handleRequestInfo,
    handleProcessInfoResponse
  } = useOfferActions(offers, setOffers);

  // Fonction pour rafraîchir manuellement les offres
  const refreshOffers = useCallback(() => {
    console.log("Manually refreshing offers");
    return fetchOffers();
  }, [fetchOffers]);

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
    refreshOffers, // Nouvelle fonction pour rafraîchir manuellement
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus,
    handleRequestInfo,
    handleProcessInfoResponse
  };
};
