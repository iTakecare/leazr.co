
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
    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!user) {
          setLoading(false);
          setError("Utilisateur non connecté");
          return;
        }
        
        console.log("Fetching contracts for user:", user.email);
        
        // Récupérer l'ID du client
        const userEmail = user.email;
        
        if (!userEmail) {
          console.error("No email found for user");
          setLoading(false);
          setError("Email de l'utilisateur non trouvé");
          return;
        }
        
        // Première étape: obtenir l'ID du client à partir de l'email
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (clientError) {
          console.error("Error fetching client ID:", clientError);
          setLoading(false);
          setError(`Erreur lors de la récupération du client: ${clientError.message}`);
          return;
        }
        
        if (!clientData) {
          console.log("No client found for email:", userEmail);
          setLoading(false);
          setError("Aucun compte client trouvé pour cet email");
          return;
        }
        
        console.log("Found client:", clientData);
        setClientId(clientData.id);
        
        // Test de débogage: récupérer tous les contrats
        const { data: allContracts, error: debugError } = await supabase
          .from('contracts')
          .select('*');
          
        if (debugError) {
          console.error("Debug - Error fetching all contracts:", debugError);
        } else {
          console.log("DEBUG - Tous les contrats dans la base de données:", allContracts);
        }
        
        // Récupérer les contrats associés au client
        const { data: clientContracts, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('client_id', clientData.id);
          
        if (contractsError) {
          console.error("Error fetching contracts:", contractsError);
          setLoading(false);
          setError(`Erreur lors de la récupération des contrats: ${contractsError.message}`);
          return;
        }
        
        console.log(`Récupéré ${clientContracts?.length || 0} contrats pour le client ${clientData.name}:`, clientContracts);
        
        // Essayons également de vérifier par client_name si pas de résultat
        if (!clientContracts || clientContracts.length === 0) {
          console.log("No contracts found by client_id, trying by client_name");
          
          const { data: nameContracts, error: nameError } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_name', clientData.name);
            
          if (nameError) {
            console.error("Error fetching contracts by name:", nameError);
          } else if (nameContracts && nameContracts.length > 0) {
            console.log(`Found ${nameContracts.length} contracts by client_name:`, nameContracts);
            
            // Mettre à jour client_id pour ces contrats
            for (const contract of nameContracts) {
              const { error: updateError } = await supabase
                .from('contracts')
                .update({ client_id: clientData.id })
                .eq('id', contract.id);
                
              if (updateError) {
                console.error(`Error updating contract ${contract.id}:`, updateError);
              } else {
                console.log(`Updated client_id for contract ${contract.id}`);
              }
            }
            
            setContracts(nameContracts);
          } else {
            console.log("No contracts found by client_name either");
            setContracts([]);
          }
        } else {
          setContracts(clientContracts);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error in fetchContracts:", error);
        setLoading(false);
        setError("Erreur lors de la récupération des contrats");
        toast.error("Erreur lors du chargement des contrats");
      }
    };

    fetchContracts();
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
