
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching client contracts for user:", user.id);
        
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

    fetchContracts();
  }, [user]);

  return { contracts, isLoading, error };
};
