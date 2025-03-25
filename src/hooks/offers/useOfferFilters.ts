
import { useState, useEffect } from 'react';
import { Offer } from './useFetchOffers';

export const useOfferFilters = (offers: Offer[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  
  useEffect(() => {
    let result = [...offers];
    
    // Filtre par statut (onglet actif)
    if (activeTab !== "all") {
      result = result.filter(offer => offer.workflow_status === activeTab);
    }
    
    // Filtre par type d'offre (admin_offer, partner_offer, etc.)
    if (activeType !== "all") {
      result = result.filter(offer => offer.type === activeType);
    }
    
    // Filtre par terme de recherche
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(offer => {
        return offer.client_name?.toLowerCase().includes(lowercasedSearch) ||
               offer.equipment_description?.toLowerCase().includes(lowercasedSearch) ||
               String(offer.amount).includes(lowercasedSearch) ||
               String(offer.monthly_payment).includes(lowercasedSearch);
      });
    }
    
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
