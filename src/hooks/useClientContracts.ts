
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();

export interface ClientContract {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  status: string;
  leaser_name?: string;
  equipment_description?: string;
  offer_id?: string;
}

export const useClientContracts = (clientEmail?: string | null, clientId?: string | null) => {
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching contracts for: ${clientEmail || ''} / Client ID: ${clientId || ''}`);
      
      let query = supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters based on available parameters
      if (clientId) {
        // If clientId is provided, filter by client_id
        console.log("Filtering contracts by client_id:", clientId);
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        // If only email is provided, filter by client using client related info
        const { data: clientData } = await supabase
          .from('clients')
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

  const refresh = () => {
    fetchContracts();
  };

  return { contracts, loading, error, refresh };
};
