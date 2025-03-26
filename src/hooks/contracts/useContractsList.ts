
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Contract, getContracts } from "@/services/contracts";

export const useContractsList = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      setIsRefreshing(true);
      console.log("FETCH: Loading contracts, includeCompleted:", includeCompleted);
      const data = await getContracts(includeCompleted);
      console.log("FETCH: Contracts loaded:", data);
      setContracts(data);
    } catch (error: any) {
      console.error("FETCH ERROR: Error fetching contracts:", error);
      setLoadingError("Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return {
    contracts,
    loading,
    loadingError,
    isRefreshing,
    includeCompleted,
    setIncludeCompleted,
    fetchContracts
  };
};
