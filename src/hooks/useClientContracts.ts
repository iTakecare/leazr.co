
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ClientContract = {
  id: string;
  offer_id: string;
  client_id: string;
  client_name: string;
  monthly_payment: number;
  equipment_description?: string;
  status: string;
  leaser_name: string;
  leaser_logo?: string;
  created_at: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_status?: string;
};

export const useClientContracts = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) return null;
      
      try {
        console.log("Fetching client ID for user:", user.email);
        
        // Première tentative: chercher par email
        if (user.email) {
          const { data: dataByEmail, error: errorByEmail } = await supabase
            .from('clients')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (!errorByEmail && dataByEmail) {
            console.log("Found client ID by email:", dataByEmail.id);
            setClientId(dataByEmail.id);
            return dataByEmail.id;
          } else {
            console.log("No client found for email:", user.email);
          }
        }
        
        // Deuxième tentative: chercher par user_id
        if (user.id) {
          const { data: dataByUserId, error: errorByUserId } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (!errorByUserId && dataByUserId) {
            console.log("Found client ID by user_id:", dataByUserId.id);
            setClientId(dataByUserId.id);
            return dataByUserId.id;
          } else {
            console.log("No client found for user_id:", user.id);
          }
        }
        
        // Si aucun client n'est trouvé, retourner null
        console.log("No client found for this user");
        return null;
      } catch (error) {
        console.error("Error in fetchClientId:", error);
        return null;
      }
    };

    const fetchClientContracts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const id = await fetchClientId();
        
        if (!id) {
          setLoading(false);
          setError("Compte client non trouvé");
          return;
        }
        
        console.log("Fetching contracts for client ID:", id);
        
        const { data, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', id);
          
        if (contractsError) {
          console.error("Error fetching contracts:", contractsError);
          setError("Erreur lors de la récupération des contrats");
          toast.error("Erreur lors du chargement des contrats");
        } else {
          console.log("Fetched contracts:", data);
          setContracts(data || []);
        }
      } catch (error) {
        console.error("Error fetching client contracts:", error);
        setError("Erreur lors de la récupération des contrats");
        toast.error("Erreur lors du chargement des contrats");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchClientContracts();
    } else {
      setLoading(false);
      setError("Utilisateur non connecté");
    }
  }, [user]);

  const refresh = () => {
    setLoading(true);
    setContracts([]);
  };

  return {
    contracts,
    loading,
    error,
    clientId,
    refresh
  };
};
