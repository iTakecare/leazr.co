
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const supabase = getSupabaseClient();

export interface ClientContract {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  status: string;
  equipment_description?: string;
  equipment_data?: any[]; // Similar structured data as ClientOffer
  leaser_name?: string;
  tracking_number?: string;
}

export const useClientContracts = () => {
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);

    try {
      let clientId = null;
      
      // If we have a user with client_id, use that directly
      if (user?.client_id) {
        clientId = user.client_id;
        console.log("Using client ID from user context:", clientId);
      } else if (user?.id) {
        // Try to get client ID by user ID
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
          
        if (clientData) {
          clientId = clientData.id;
          console.log("Found client ID by user association:", clientId);
        }
      }
      
      // First attempt: Find by client_id if we have it
      let contractResults = [];
      
      if (clientId) {
        const { data: clientIdContracts, error: clientIdError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        
        if (clientIdError) {
          console.error("Error fetching contracts by client ID:", clientIdError);
        } else if (clientIdContracts && clientIdContracts.length > 0) {
          console.log(`Found ${clientIdContracts.length} contracts with client_id ${clientId}`);
          contractResults = clientIdContracts;
        } else {
          console.log(`No contracts found with client_id ${clientId}`);
        }
      }
      
      // Second attempt: Find by client_name if user has a name/client name & no contracts were found
      if (contractResults.length === 0) {
        let clientName = '';
        
        if (user?.name) {
          clientName = user.name;
        } else if (user?.first_name && user?.last_name) {
          clientName = `${user.first_name} ${user.last_name}`;
        } else if (clientId) {
          // Try to get client name from client ID
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .maybeSingle();
            
          if (clientData?.name) {
            clientName = clientData.name;
          }
        }
        
        if (clientName) {
          console.log("Looking for contracts by client name:", clientName);
          
          const { data: nameContracts, error: nameError } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_name', clientName)
            .order('created_at', { ascending: false });
            
          if (nameError) {
            console.error("Error fetching contracts by client name:", nameError);
          } else if (nameContracts && nameContracts.length > 0) {
            console.log(`Found ${nameContracts.length} contracts with client_name ${clientName}`);
            contractResults = nameContracts;
          } else {
            console.log(`No contracts found by client_name either`);
          }
        }
      }
      
      // Process the data to ensure equipment_data is parsed when needed
      const processedData = (contractResults || []).map(contract => {
        // Parse equipment_description if it's a JSON string
        let equipment_data = null;
        if (contract.equipment_description && typeof contract.equipment_description === 'string') {
          try {
            equipment_data = JSON.parse(contract.equipment_description);
          } catch (e) {
            console.log('Error parsing equipment data:', e);
          }
        }
        
        return {
          ...contract,
          equipment_data: equipment_data
        };
      });

      setContracts(processedData || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur lors de la récupération des contrats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user]);

  const refresh = () => {
    fetchContracts();
  };

  return { contracts, loading, error, refresh };
};
