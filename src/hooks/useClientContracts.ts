
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
  delivery_carrier?: string;
};

export const useClientContracts = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const fetchContracts = async (forceClientId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user && !forceClientId) {
        setLoading(false);
        setError("Utilisateur non connecté");
        return;
      }
      
      const targetClientId = forceClientId || clientId;
      console.log("Fetching contracts with parameters:", { 
        userEmail: user?.email, 
        clientId: targetClientId,
        forceClientId
      });
      
      // Direct fetch by client ID if provided (useful for admin views or direct links)
      if (targetClientId) {
        console.log("Direct fetch by client ID:", targetClientId);
        await fetchContractsByClientId(targetClientId);
        return;
      }
      
      // If no direct client ID, get user email and find the client
      if (!user?.email) {
        console.error("No user email found");
        setLoading(false);
        setError("Email de l'utilisateur non trouvé");
        return;
      }
      
      // First step: get client ID from email
      await fetchClientIdFromEmail(user.email);
    } catch (error) {
      console.error("Error in fetchContracts:", error);
      setLoading(false);
      setError("Erreur lors de la récupération des contrats");
      toast.error("Erreur lors du chargement des contrats");
    }
  };

  const fetchClientIdFromEmail = async (email: string) => {
    try {
      console.log("Looking up client ID for email:", email);
      
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('email', email)
        .maybeSingle();
      
      if (clientError) {
        console.error("Error fetching client ID:", clientError);
        setLoading(false);
        setError(`Erreur lors de la récupération du client: ${clientError.message}`);
        return;
      }
      
      if (!clientData) {
        console.log("No client found for email:", email);
        setLoading(false);
        setError("Aucun compte client trouvé pour cet email");
        return;
      }
      
      console.log("Found client:", clientData);
      setClientId(clientData.id);
      
      // Now fetch contracts with this client ID
      await fetchContractsByClientId(clientData.id);
    } catch (error) {
      console.error("Error in fetchClientIdFromEmail:", error);
      setLoading(false);
      setError("Erreur lors de la récupération de l'identifiant client");
    }
  };

  const fetchContractsByClientId = async (id: string) => {
    try {
      console.log("Fetching contracts for client ID:", id);
      
      // Debug - fetch all contracts first for diagnostic purposes
      const { data: allContracts, error: debugError } = await supabase
        .from('contracts')
        .select('*');
        
      if (debugError) {
        console.error("Debug - Error fetching all contracts:", debugError);
      } else {
        console.log("DEBUG - All contracts in database:", allContracts);
        
        if (allContracts) {
          const contractsForThisClient = allContracts.filter(c => 
            c.client_id === id || 
            (c.clients && c.clients.id === id)
          );
          console.log(`DEBUG - Filtered ${contractsForThisClient.length} contracts for client ID ${id}`);
        }
      }
      
      // Fetch contracts by client_id
      const { data: clientContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*, clients(*)')
        .eq('client_id', id);
        
      if (contractsError) {
        console.error("Error fetching contracts by client_id:", contractsError);
        setLoading(false);
        setError(`Erreur lors de la récupération des contrats: ${contractsError.message}`);
        return;
      }
      
      console.log(`Retrieved ${clientContracts?.length || 0} contracts for client ${id}:`, clientContracts);
      
      // If no contracts found by client_id, try by client_name
      if (!clientContracts || clientContracts.length === 0) {
        await tryFetchByClientName(id);
      } else {
        setContracts(clientContracts);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in fetchContractsByClientId:", error);
      setLoading(false);
      setError("Erreur lors de la récupération des contrats");
    }
  };

  const tryFetchByClientName = async (clientId: string) => {
    try {
      // Get the client name first
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();
        
      if (clientError || !clientData) {
        console.error("Error fetching client name:", clientError);
        setLoading(false);
        setContracts([]);
        return;
      }
      
      console.log("Looking for contracts by client name:", clientData.name);
      
      const { data: nameContracts, error: nameError } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_name', clientData.name);
        
      if (nameError) {
        console.error("Error fetching contracts by name:", nameError);
        setLoading(false);
        setContracts([]);
        return;
      }
      
      if (nameContracts && nameContracts.length > 0) {
        console.log(`Found ${nameContracts.length} contracts by client_name:`, nameContracts);
        
        // Update client_id for these contracts
        for (const contract of nameContracts) {
          try {
            const { error: updateError } = await supabase
              .from('contracts')
              .update({ client_id: clientId })
              .eq('id', contract.id);
              
            if (updateError) {
              console.error(`Error updating contract ${contract.id}:`, updateError);
            } else {
              console.log(`Updated client_id for contract ${contract.id}`);
            }
          } catch (updateErr) {
            console.error(`Exception updating contract ${contract.id}:`, updateErr);
          }
        }
        
        setContracts(nameContracts);
      } else {
        console.log("No contracts found by client_name either");
        setContracts([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in tryFetchByClientName:", error);
      setLoading(false);
      setContracts([]);
    }
  };

  // Debug function to diagnose contract lookup issues
  const runDiagnostics = async () => {
    try {
      console.log("Running contract diagnostics...");
      console.log("Current user:", user);
      console.log("Current clientId:", clientId);
      
      // Get all clients
      const { data: allClients } = await supabase
        .from('clients')
        .select('*');
        
      console.log("All clients:", allClients);
      
      // Get all contracts
      const { data: allContracts } = await supabase
        .from('contracts')
        .select('*');
        
      console.log("All contracts:", allContracts);
      
      // Find potential matches
      if (allClients && allContracts && user?.email) {
        const userClient = allClients.find(c => c.email === user.email);
        console.log("Client matching user email:", userClient);
        
        if (userClient) {
          const nameMatches = allContracts.filter(c => 
            c.client_name === userClient.name
          );
          console.log("Contracts matching by name:", nameMatches);
          
          const idMatches = allContracts.filter(c => 
            c.client_id === userClient.id
          );
          console.log("Contracts matching by ID:", idMatches);
        }
      }
      
      toast.success("Diagnostic terminé, consultez la console");
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast.error("Erreur lors du diagnostic");
    }
  };

  useEffect(() => {
    if (user || clientId) {
      fetchContracts();
    }
  }, [user, retry]);

  const refresh = (forceClientId?: string) => {
    // Clear cache and retry
    if (user) {
      localStorage.removeItem(`client_id_${user.id}`);
    }
    setLoading(true);
    setContracts([]);
    if (forceClientId) {
      fetchContracts(forceClientId);
    } else {
      setRetry(prev => prev + 1);
    }
  };

  return {
    contracts,
    loading,
    error,
    clientId,
    refresh,
    debug: runDiagnostics
  };
};
