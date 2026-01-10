
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useMultiTenant } from "./useMultiTenant";

const supabase = getSupabaseClient();

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
      
      // Utiliser le service multi-tenant au lieu d'une requête directe
      let query = services.contracts.query()
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters based on available parameters
      if (idToUse) {
        // If clientId is provided, filter by client_id
        console.log("Filtering contracts by client_id:", idToUse);
        query = query.eq('client_id', idToUse);
      } else if (clientEmail) {
        // If only email is provided, filter by client using client related info
        const { data: clientData } = await services.clients.query()
          .select('id')
          .eq('email', clientEmail)
          .single();
        
        if (clientData?.id) {
          console.log("Found client ID from email:", clientData.id);
          query = query.eq('client_id', clientData.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`Retrieved ${data?.length || 0} contracts for client`);
      setContracts(data || []);
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
