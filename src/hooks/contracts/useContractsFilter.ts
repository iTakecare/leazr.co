
import { useState, useEffect } from "react";
import { Contract } from "@/services/contracts";

export const useContractsFilter = (contracts: Contract[]) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);

  useEffect(() => {
    filterContracts();
  }, [contracts, activeStatusFilter, searchTerm]);

  const filterContracts = () => {
    let filtered = [...contracts];
    
    // Filtre par statut
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter(contract => contract.status === activeStatusFilter);
    }
    
    // Filtre par terme de recherche
    if (searchTerm.trim() !== "") {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(contract => 
        contract.client_name.toLowerCase().includes(lowerCaseSearch) ||
        contract.equipment_description?.toLowerCase().includes(lowerCaseSearch) ||
        contract.leaser_name.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    setFilteredContracts(filtered);
  };

  return {
    filteredContracts,
    activeStatusFilter,
    setActiveStatusFilter,
    searchTerm,
    setSearchTerm
  };
};
