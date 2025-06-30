
import { useState, useEffect } from "react";
import { 
  getContractById, 
  getContractEquipment, 
  getContractDocuments,
  getContractWorkflowLogs,
  Contract,
  ContractEquipment,
  ContractDocument
} from "@/services/contractService";

export const useContractDetail = (contractId: string) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [equipment, setEquipment] = useState<ContractEquipment[]>([]);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractDetails = async () => {
    if (!contractId) {
      setError("ID de contrat manquant");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 Chargement des détails du contrat:", contractId);
      
      // Charger toutes les données en parallèle
      const [contractData, equipmentData, documentsData, logsData] = await Promise.all([
        getContractById(contractId),
        getContractEquipment(contractId),
        getContractDocuments(contractId),
        getContractWorkflowLogs(contractId)
      ]);
      
      if (!contractData) {
        setError("Contrat non trouvé");
        return;
      }
      
      setContract(contractData);
      setEquipment(equipmentData);
      setDocuments(documentsData);
      setLogs(logsData);
      
      console.log("✅ Détails du contrat chargés avec succès");
    } catch (err) {
      console.error("❌ Erreur lors du chargement des détails du contrat:", err);
      setError("Erreur lors du chargement du contrat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractDetails();
  }, [contractId]);

  return {
    contract,
    equipment,
    documents,
    logs,
    loading,
    error,
    refetch: fetchContractDetails
  };
};
