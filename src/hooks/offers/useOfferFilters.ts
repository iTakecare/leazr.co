
import { useState, useEffect } from "react";
import { Offer } from "./useFetchOffers";

export const useOfferFilters = (offers: Offer[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [activeType, setActiveType] = useState("all");
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  
  // Définir les ensembles de statuts
  const DRAFT = ["draft"];
  const IN_PROGRESS = ["info_requested", "internal_docs_requested", "internal_review", "leaser_review", "client_review"];
  const ACCEPTED = ["accepted", "offer_accepted", "leaser_approved", "financed", "contract_sent", "signed", "approved"];
  const REJECTED = ["internal_rejected", "leaser_rejected", "client_rejected", "rejected"];
  
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
    if (activeTab === "active") {
      console.log(`Filtering by active status: not accepted and not rejected`);
      result = result.filter(offer => !ACCEPTED.includes(offer.workflow_status) && !REJECTED.includes(offer.workflow_status));
    } else if (activeTab === "draft") {
      console.log(`Filtering by workflow status: draft`);
      result = result.filter(offer => DRAFT.includes(offer.workflow_status));
    } else if (activeTab === "in_progress") {
      console.log(`Filtering by workflow status: in_progress`);
      result = result.filter(offer => IN_PROGRESS.includes(offer.workflow_status));
    } else if (activeTab === "accepted") {
      console.log(`Filtering by accepted statuses`);
      result = result.filter(offer => ACCEPTED.includes(offer.workflow_status));
    } else if (activeTab === "rejected") {
      console.log(`Filtering by rejected statuses`);
      result = result.filter(offer => REJECTED.includes(offer.workflow_status));
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
