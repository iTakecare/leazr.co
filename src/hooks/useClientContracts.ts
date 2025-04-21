
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Contract } from '@/types/contract';
import { toast } from 'sonner';

export const useClientContracts = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchContracts = async (specificClientId?: string) => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching client contracts for user:", user.id);
      
      // If a specific client ID is provided, use it
      if (specificClientId) {
        setClientId(specificClientId);
        console.log("Using specific client ID:", specificClientId);
      }
      
      // Récupérer les contrats pour les clients liés à l'utilisateur
      let { data: clientContracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!contracts_client_id_fkey (
            id,
            name,
            company
          )
        `)
        .eq('user_id', user.id);

      if (contractsError) {
        console.error("Error fetching contracts:", contractsError);
        throw new Error("Erreur lors de la récupération des contrats");
      }

      // Récupérer les informations du profil pour les contrats
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      const profile = profileData || {};

      if (clientContracts) {
        console.log(`Found ${clientContracts.length} contracts for user`);
        
        // Transformer les données pour utilisation dans l'interface
        const formattedContracts = clientContracts.map(contract => ({
          ...contract,
          clientName: contract.clients?.name || contract.client_name || profile.first_name || 'Client sans nom',
          clientCompany: contract.clients?.company || ''
        }));
        
        setContracts(formattedContracts);
      } else {
        setContracts([]);
      }
    } catch (err) {
      console.error("Error in useClientContracts:", err);
      setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function for diagnostic purposes
  const debug = () => {
    console.log("Debug info for useClientContracts:");
    console.log("User ID:", user?.id);
    console.log("Client ID:", clientId);
    console.log("Contracts count:", contracts.length);
    console.log("Loading state:", isLoading);
    console.log("Error state:", error);
    
    // Return some debug information
    return {
      userID: user?.id,
      clientID: clientId,
      contractsCount: contracts.length,
      loadingState: isLoading,
      errorState: Boolean(error)
    };
  };

  useEffect(() => {
    fetchContracts();
  }, [user]);

  // Return with the expected properties
  return { 
    contracts, 
    isLoading, 
    error,
    clientId,
    // Aliases for backward compatibility
    loading: isLoading,
    refresh: fetchContracts,
    debug
  };
};
