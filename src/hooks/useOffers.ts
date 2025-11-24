import { useState } from "react";
import { useFetchOffers } from "./offers/useFetchOffers";
import { useOfferFilters } from "./offers/useOfferFilters";
import { useOfferActions } from "./offers/useOfferActions";
import { useQueryClient } from "@tanstack/react-query";

export const useOffers = () => {
  const queryClient = useQueryClient();
  
  const { 
    offers, 
    loading, 
    loadingError, 
    includeConverted, 
    setIncludeConverted, 
    fetchOffers
  } = useFetchOffers();

  const {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    activeSource,
    setActiveSource,
    filteredOffers
  } = useOfferFilters(offers);

  // Créer un setter factice pour maintenir la compatibilité
  const setOffers = () => {
    // Invalider le cache React Query au lieu de modifier le state directement
    queryClient.invalidateQueries({ queryKey: ['offers'] });
  };

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
    activeSource,
    setActiveSource,
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
