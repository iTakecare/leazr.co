
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
    if (activeTab === "draft") {
      console.log(`Filtering by workflow status: draft`);
      result = result.filter(offer => offer.workflow_status === 'draft');
    } else if (activeTab === "in_progress") {
      // Onglet "En cours" : tout sauf brouillons, acceptées (score A leaser) et refusées (score C)
      console.log(`Filtering by in_progress: not draft, not accepted (leaser score A), not rejected (score C)`);
      result = result.filter(offer => 
        offer.workflow_status !== 'draft' &&
        offer.leaser_score !== 'A' &&
        offer.internal_score !== 'C' && 
        offer.leaser_score !== 'C'
      );
    } else if (activeTab === "accepted") {
      // Onglet "Acceptées" : score A du leaser (contrat prêt)
      console.log(`Filtering by accepted: leaser_score = A`);
      result = result.filter(offer => offer.leaser_score === 'A');
    } else if (activeTab === "rejected") {
      // Onglet "Refusées" : score C (interne ou leaser)
      console.log(`Filtering by rejected: score C`);
      result = result.filter(offer => 
        offer.internal_score === 'C' || offer.leaser_score === 'C'
      );
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
