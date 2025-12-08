
import { useState, useEffect } from "react";
import { Offer } from "./useFetchOffers";

export const useOfferFilters = (offers: Offer[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("in_progress");
  const [activeType, setActiveType] = useState("all");
  const [activeSource, setActiveSource] = useState("all");
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  
  useEffect(() => {
    if (!offers || offers.length === 0) {
      setFilteredOffers([]);
      return;
    }

    console.log(`Filtering ${offers.length} offers with criteria:`, {
      searchTerm,
      activeTab,
      activeType,
      activeSource
    });
    
    // Statuts "Acceptées" = Validation finale par le leaser
    const acceptedStatuses = new Set([
      'accepted',        // Accepté par le leaser (validation finale)
      'validated',       // Contrat prêt
      'financed',        // Financé
      'contract_sent',   // Contrat envoyé
      'signed'           // Signé
    ]);
    
    // Statuts "Facturé" = Offres d'achat en facturation
    const invoicedStatuses = new Set([
      'invoicing'        // En facturation (offres d'achat)
    ]);
    
    // Statuts "Refusées" = Tous les types de rejets
    const rejectedStatuses = new Set([
      'internal_rejected',  // Rejeté en interne
      'leaser_rejected',    // Rejeté par le leaser
      'rejected',           // Rejeté (général)
      'client_rejected'     // Rejeté par le client
    ]);
    
    // Filtre par statut (onglet actif) - basé uniquement sur workflow_status
    let result = offers.filter(offer => {
      const status = (offer.workflow_status || '').toString().trim().toLowerCase();
      
      if (activeTab === "accepted") {
        return acceptedStatuses.has(status);
      } else if (activeTab === "invoiced") {
        return invoicedStatuses.has(status);
      } else if (activeTab === "rejected") {
        return rejectedStatuses.has(status);
      } else {
        // in_progress: exclut les acceptés, facturés et refusés
        return !acceptedStatuses.has(status) && !invoicedStatuses.has(status) && !rejectedStatuses.has(status);
      }
    });
    
    // Filtre par type d'offre (admin_offer, client_request, etc.)
    if (activeType !== "all") {
      console.log(`Filtering by offer type: ${activeType}`);
      result = result.filter(offer => offer.type === activeType);
    }
    
    // Filtre par présence de packs personnalisés
    if (activeSource !== "all") {
      console.log(`Filtering by pack presence: ${activeSource}`);
      const hasCustomPacks = activeSource === "custom_pack";
      result = result.filter(offer => {
        const offerHasPacks = offer.offer_custom_packs && offer.offer_custom_packs.length > 0;
        return hasCustomPacks ? offerHasPacks : !offerHasPacks;
      });
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
  }, [offers, searchTerm, activeTab, activeType, activeSource]);
  
  return {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    activeSource,
    setActiveSource,
    filteredOffers
  };
};
