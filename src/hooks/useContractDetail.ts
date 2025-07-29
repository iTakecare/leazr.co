
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
      console.log("🔐 Vérification de l'authentification...");
      
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
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement des détails du contrat:", err);
      
      // Gérer spécifiquement les erreurs d'authentification
      if (err?.message?.includes('JWT') || err?.message?.includes('auth') || err?.code === 'PGRST301') {
        console.error("🔐 Erreur d'authentification détectée:", err);
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err?.message?.includes('RLS') || err?.message?.includes('policy')) {
        console.error("🛡️ Erreur RLS détectée:", err);
        setError("Accès refusé. Vous n'avez pas les permissions pour voir ce contrat.");
      } else {
        setError("Erreur lors du chargement du contrat");
      }
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
