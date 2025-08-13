import { useState, useEffect } from "react";
import { 
  getContractEquipmentDeliveries, 
  createContractEquipmentDeliveries,
  getContractDeliveries
} from "@/services/deliveryService";
import { ContractEquipmentDelivery, EquipmentDeliveryConfig } from "@/types/contractDelivery";

export const useIndividualDeliveries = (contractId: string) => {
  const [deliveries, setDeliveries] = useState<Record<string, ContractEquipmentDelivery[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const contractDeliveries = await getContractDeliveries(contractId);
      setDeliveries(contractDeliveries);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération des livraisons");
    } finally {
      setLoading(false);
    }
  };

  const getDeliveriesForEquipment = async (equipmentId: string): Promise<ContractEquipmentDelivery[]> => {
    try {
      return await getContractEquipmentDeliveries(equipmentId);
    } catch (error) {
      console.error("Error fetching deliveries for equipment:", error);
      return [];
    }
  };

  const createDeliveries = async (
    config: EquipmentDeliveryConfig
  ): Promise<boolean> => {
    try {
      await createContractEquipmentDeliveries(config);
      // Rafraîchir les données après création
      const updatedDeliveries = await getDeliveriesForEquipment(config.equipmentId);
      setDeliveries(prev => ({
        ...prev,
        [config.equipmentId]: updatedDeliveries
      }));
      return true;
    } catch (error) {
      console.error("Error creating deliveries:", error);
      return false;
    }
  };

  const hasIndividualDeliveries = (equipmentId: string): boolean => {
    return deliveries[equipmentId]?.length > 0 || false;
  };

  const getDeliveryCount = (equipmentId: string): number => {
    return deliveries[equipmentId]?.length || 0;
  };

  const getTotalQuantityDelivered = (equipmentId: string): number => {
    return deliveries[equipmentId]?.reduce((sum, delivery) => sum + delivery.quantity, 0) || 0;
  };

  useEffect(() => {
    if (contractId) {
      fetchDeliveries();
    }
  }, [contractId]);

  return {
    deliveries,
    loading,
    error,
    fetchDeliveries,
    getDeliveriesForEquipment,
    createDeliveries,
    hasIndividualDeliveries,
    getDeliveryCount,
    getTotalQuantityDelivered
  };
};