
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useMultiTenant } from "./useMultiTenant";

const supabase = getSupabaseClient();

export interface ContractEquipmentItem {
  id: string;
  title: string;
  quantity: number;
  serial_number?: string | null;
}

export interface ClientContract {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  status: string;
  leaser_name?: string;
  leaser_logo?: string;
  equipment_description?: string;
  offer_id?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_carrier?: string;
  delivery_status?: string;
  contract_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_duration?: number;
  contract_equipment?: ContractEquipmentItem[];
}

export const useClientContracts = (clientEmail?: string | null, clientId?: string | null) => {
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { services } = useMultiTenant();

  const fetchContracts = async (specificClientId?: string) => {
    console.log('🔍 CLIENT CONTRACTS - fetchContracts démarré avec:', { clientEmail, clientId, specificClientId });
    setLoading(true);
    setError(null);

    try {
      const idToUse = specificClientId || clientId;
      console.log(`Fetching contracts for: ${clientEmail || ''} / Client ID: ${idToUse || ''}`);
      
      // Utiliser le service multi-tenant avec jointure sur contract_equipment
      let query = services.contracts.query()
        .select(`
          *,
          contract_equipment (
          id,
            title,
            quantity,
            serial_number
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters based on available parameters
      if (idToUse) {
        console.log("Filtering contracts by client_id:", idToUse);
        query = query.eq('client_id', idToUse);
      } else if (clientEmail) {
        const { data: clientData } = await services.clients.query()
          .select('id')
          .eq('email', clientEmail)
          .single();
        
        if (clientData?.id) {
          console.log("Found client ID from email:", clientData.id);
          query = query.eq('client_id', clientData.id);
        } else {
          console.warn("No client found for email, returning empty");
          setContracts([]);
          setLoading(false);
          return;
        }
      } else {
        console.warn("No client ID or email provided, returning empty");
        setContracts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }
      
      // Générer equipment_description à partir de contract_equipment si absent
      const contractsWithEquipment = (data || []).map((contract: any) => {
        if (!contract.equipment_description && contract.contract_equipment?.length > 0) {
          const equipmentList = contract.contract_equipment.map((eq: ContractEquipmentItem) => ({
            title: eq.title,
            quantity: eq.quantity
          }));
          return {
            ...contract,
            equipment_description: JSON.stringify(equipmentList)
          };
        }
        return contract;
      });
      
      console.log(`Retrieved ${contractsWithEquipment.length} contracts for client`);
      setContracts(contractsWithEquipment);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur lors de la récupération des contrats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [clientEmail, clientId]);

  const refresh = (specificClientId?: string) => {
    fetchContracts(specificClientId);
  };

  const debug = () => {
    console.log("Debug information for contracts:");
    console.log("Current client ID:", clientId);
    console.log("Current client email:", clientEmail);
    console.log("Contracts count:", contracts.length);
    console.log("Contracts:", contracts);
  };

  return { contracts, loading, error, refresh, debug, clientId };
};
