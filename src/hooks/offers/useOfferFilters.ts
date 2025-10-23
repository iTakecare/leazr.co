
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
    
    // Définir les statuts acceptés et refusés
    const acceptedStatuses = new Set([
      'validated', 'accepted', 'offer_validation', 'financed', 'contract_sent', 'signed', 'approved', 'offer_accepted'
    ]);
    const rejectedStatuses = new Set([
      'internal_rejected', 'leaser_rejected', 'rejected', 'client_rejected'
    ]);
    
    // Filtre par statut (onglet actif) - basé uniquement sur workflow_status
    let result = offers.filter(offer => {
      const status = (offer.workflow_status || '').toString().trim().toLowerCase();
      
      if (activeTab === "accepted") {
        return acceptedStatuses.has(status);
      } else if (activeTab === "rejected") {
        return rejectedStatuses.has(status);
      } else {
        // in_progress: inclut les brouillons et tous les statuts intermédiaires
        return !acceptedStatuses.has(status) && !rejectedStatuses.has(status);
      }
    });
    
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
