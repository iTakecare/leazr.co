
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
    
    // Masquer automatiquement les offres rejetées et acceptées (sauf si "all")
    if (activeTab !== "all") {
      result = result.filter(offer => 
        offer.workflow_status !== "internal_rejected" && 
        offer.workflow_status !== "accepted" &&
        offer.workflow_status !== "internal_approved"
      );
    }
    
    // Filtre par statut (onglet actif)
    if (activeTab === "draft") {
      console.log(`Filtering by workflow status: draft`);
      result = result.filter(offer => offer.workflow_status === "draft");
    } else if (activeTab === "in_progress") {
      console.log(`Filtering by workflow status: in_progress (info_requested, internal_docs_requested)`);
      result = result.filter(offer => 
        offer.workflow_status === "info_requested" || 
        offer.workflow_status === "internal_docs_requested"
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
