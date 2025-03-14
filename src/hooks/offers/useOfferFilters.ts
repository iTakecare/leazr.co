
import { useState, useMemo } from "react";
import { Offer } from "./useFetchOffers";

export const useOfferFilters = (offers: Offer[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeType, setActiveType] = useState("all");

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const clientName = offer.client_name.toLowerCase();
      const clientCompany = offer.clients?.company?.toLowerCase() || '';
      
      const matchesSearch = 
        clientName.includes(searchTerm.toLowerCase()) ||
        clientCompany.includes(searchTerm.toLowerCase());
      
      const matchesTab = activeTab === "all" || offer.status === activeTab;
      
      const matchesType = activeType === "all" || offer.type === activeType;
      
      return matchesSearch && matchesTab && matchesType;
    });
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
