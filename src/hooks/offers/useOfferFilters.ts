
import { useState, useEffect } from "react";
import { Offer } from "./useFetchOffers";

export const useOfferFilters = (offers: Offer[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");
  const [activeType, setActiveType] = useState("all");
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  
  useEffect(() => {
    if (!offers || offers.length === 0) {
      setFilteredOffers([]);
      return;
    }

    console.log(`Filtering ${offers.length} offers with criteria:`, {
      searchTerm,
      activeTab,
      activeType
    });
    
    let result = [...offers];
    
    // Filtre par statut (onglet actif)
    if (activeTab === "in_progress") {
      // Onglet "En cours" : tout sauf acceptées finales et refusées (score C) - INCLUT LES BROUILLONS
      console.log(`Filtering by in_progress: not accepted final, not rejected (score C) - includes drafts`);
      result = result.filter(offer => {
        const status = (offer.workflow_status || '').toString().trim().toLowerCase();
        const leaserScore = (offer.leaser_score || '').toString().trim().toUpperCase();
        const internalScore = (offer.internal_score || '').toString().trim().toUpperCase();
        
        const isRejected = internalScore === 'C' || leaserScore === 'C';
        const acceptedStatuses = ['validated', 'accepted', 'offer_validation', 'financed', 'contract_sent', 'signed'];
        const isAcceptedFinal = (acceptedStatuses.includes(status) && leaserScore === 'A') || 
                                (offer.converted_to_contract === true && leaserScore === 'A');
        
        return !isRejected && !isAcceptedFinal;
      });
    } else if (activeTab === "accepted") {
      // Onglet "Acceptées" : statut accepté/validé/finalisé avec leaser_score = A OU converti en contrat avec score A
      console.log(`Filtering by accepted: accepted statuses with leaser_score = A OR converted with score A`);
      result = result.filter(offer => {
        const status = (offer.workflow_status || '').toString().trim().toLowerCase();
        const leaserScore = (offer.leaser_score || '').toString().trim().toUpperCase();
        const acceptedStatuses = ['validated', 'accepted', 'offer_validation', 'financed', 'contract_sent', 'signed'];
        const isAcceptedFinal = (acceptedStatuses.includes(status) && leaserScore === 'A') || 
                                (offer.converted_to_contract === true && leaserScore === 'A');
        return isAcceptedFinal;
      });
    } else if (activeTab === "rejected") {
      // Onglet "Refusées" : score C (interne ou leaser)
      console.log(`Filtering by rejected: score C`);
      result = result.filter(offer => {
        const leaserScore = (offer.leaser_score || '').toString().trim().toUpperCase();
        const internalScore = (offer.internal_score || '').toString().trim().toUpperCase();
        return internalScore === 'C' || leaserScore === 'C';
      });
    }
    
    // Filtre par type d'offre (admin_offer, client_request, etc.)
    if (activeType !== "all") {
      console.log(`Filtering by offer type: ${activeType}`);
      result = result.filter(offer => offer.type === activeType);
    }
    
    // Filtre par terme de recherche
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      console.log(`Filtering by search term: ${lowercasedSearch}`);
      result = result.filter(offer => {
        return offer.client_name?.toLowerCase().includes(lowercasedSearch) ||
               offer.equipment_description?.toLowerCase().includes(lowercasedSearch) ||
               String(offer.amount).includes(lowercasedSearch) ||
               String(offer.monthly_payment).includes(lowercasedSearch);
      });
    }
    
    console.log(`Filtering complete: ${result.length} offers remain`);
    setFilteredOffers(result);
  }, [offers, searchTerm, activeTab, activeType]);
  
  return {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    filteredOffers
  };
};
