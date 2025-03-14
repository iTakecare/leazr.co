
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
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) return null;
      
      try {
        console.log("Fetching client ID for user:", user.email);
        
        // First check local storage
        const cachedClientId = localStorage.getItem(`client_id_${user.id}`);
        if (cachedClientId) {
          console.log("Using cached client ID:", cachedClientId);
          setClientId(cachedClientId);
          return cachedClientId;
        }
        
        // Récupérer l'email directement depuis l'API Auth de Supabase
        const { data: userData } = await supabase.auth.getUser();
        const userEmail = userData?.user?.email || user.email;
        
        if (!userEmail) {
          console.error("No email found for user");
          return null;
        }
        
        console.log("Looking for client with email:", userEmail);
        
        // Première tentative: chercher par email
        const { data: dataByEmail, error: errorByEmail } = await supabase
          .from('clients')
          .select('id, user_id')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (!errorByEmail && dataByEmail) {
          console.log("Found client ID by email:", dataByEmail.id);
          
          // Si le user_id est null, mettre à jour le client
          if (!dataByEmail.user_id) {
            console.log("Found client without user_id, updating...");
            const { error: updateError } = await supabase
              .from('clients')
              .update({ user_id: user.id })
              .eq('id', dataByEmail.id);
              
            if (updateError) {
              console.error("Error updating client with user_id:", updateError);
            } else {
              console.log("Updated client with user_id:", user.id);
            }
          }
          
          localStorage.setItem(`client_id_${user.id}`, dataByEmail.id);
          setClientId(dataByEmail.id);
          return dataByEmail.id;
        } else {
          console.log("No client found for email:", userEmail);
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
            localStorage.setItem(`client_id_${user.id}`, dataByUserId.id);
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
          setError("Compte client non trouvé. Veuillez contacter l'administrateur.");
          return;
        }
        
        console.log("Fetching contracts for client ID:", id);
        
        // Récupérer tous les contrats pour afficher les données brutes dans la console
        const { data: allContracts, error: allContractsError } = await supabase
          .from('contracts')
          .select('*');
          
        if (allContractsError) {
          console.error("Error fetching all contracts:", allContractsError);
        } else {
          console.log("All contracts in database:", allContracts);
        }
        
        // Récupérer les contrats du client
        const { data, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', id);
          
        if (contractsError) {
          console.error("Error fetching contracts for client:", contractsError);
          setError("Erreur lors de la récupération des contrats");
          toast.error("Erreur lors du chargement des contrats");
        } else {
          console.log("Fetched contracts for client:", data);
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
  }, [user, retry]);

  const refresh = () => {
    // Clear cache and retry
    if (user) {
      localStorage.removeItem(`client_id_${user.id}`);
    }
    setLoading(true);
    setContracts([]);
    setRetry(prev => prev + 1);
  };

  return {
    contracts,
    loading,
    error,
    clientId,
    refresh
  };
};
