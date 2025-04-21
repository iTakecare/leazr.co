
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supabase = getSupabaseClient();

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

  // Cette fonction récupère les contrats, soit pour l'utilisateur connecté,
  // soit pour un ID client spécifique (ex: dans la page de détail client)
  const fetchContracts = async (forceClientId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Si forceClientId est fourni, nous l'utilisons directement
      if (forceClientId) {
        console.log("Fetching contracts with forced client ID:", forceClientId);
        setClientId(forceClientId);
        await fetchContractsByClientId(forceClientId);
        return;
      }
      
      // Pour un utilisateur non connecté sans ID client spécifié, afficher une erreur
      if (!user && !clientId) {
        setLoading(false);
        setError("Utilisateur non connecté");
        return;
      }

      // Si un ID client est déjà stocké dans l'état, l'utiliser
      if (clientId) {
        console.log("Using cached client ID:", clientId);
        await fetchContractsByClientId(clientId);
        return;
      }
      
      // Sinon, essayer de trouver l'ID client à partir de l'utilisateur connecté
      if (!user?.email) {
        console.error("No user email found");
        setLoading(false);
        setError("Email de l'utilisateur non trouvé");
        return;
      }
      
      // Vérifier d'abord dans le cache local
      if (user.id) {
        const cachedId = localStorage.getItem(`client_id_${user.id}`);
        if (cachedId) {
          console.log("Found client ID in local cache:", cachedId);
          setClientId(cachedId);
          await fetchContractsByClientId(cachedId);
          return;
        }
      }
      
      // Sinon, chercher l'ID client à partir de l'email
      await fetchClientIdFromEmail(user.email);
    } catch (err: any) {
      console.error("Error in fetchContracts:", err);
      setLoading(false);
      setError("Erreur lors de la récupération des contrats");
      toast.error("Erreur lors du chargement des contrats");
    }
  };

  const fetchClientIdFromEmail = async (email: string) => {
    try {
      console.log("Looking up client ID for email:", email);
      
      // Rechercher le client par email
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, user_id')
        .eq('email', email)
        .maybeSingle();
      
      if (clientError) {
        console.error("Error fetching client ID:", clientError);
        setLoading(false);
        setError(`Erreur lors de la récupération du client: ${clientError.message}`);
        return;
      }
      
      // Si le client n'est pas trouvé par email
      if (!clientData) {
        console.log("No client found for email:", email);
        
        // Vérifier si l'utilisateur est associé à un client par user_id
        if (user?.id) {
          const { data: clientByUserID, error: userIdError } = await supabase
            .from('clients')
            .select('id, name, email')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (clientByUserID) {
            console.log("Found client by user_id:", clientByUserID);
            setClientId(clientByUserID.id);
            
            // Mettre à jour le client avec l'email si manquant
            if (!clientByUserID.email) {
              await supabase
                .from('clients')
                .update({ email: email })
                .eq('id', clientByUserID.id);
                
              console.log(`Updated email for client ${clientByUserID.id} to ${email}`);
            }
            
            await fetchContractsByClientId(clientByUserID.id);
            return;
          }
        }
        
        // Essayer de chercher par nom + prénom de l'utilisateur si disponible
        if (user?.first_name && user?.last_name) {
          const fullName = `${user.first_name} ${user.last_name}`.trim();
          console.log("Trying to find client by full name:", fullName);
          
          const { data: clientByName, error: nameError } = await supabase
            .from('clients')
            .select('id, name, email, user_id')
            .ilike('name', `%${fullName}%`)
            .maybeSingle();
            
          if (clientByName) {
            console.log("Found client by name:", clientByName);
            setClientId(clientByName.id);
            
            // Associer le client à l'utilisateur si pas déjà fait
            if (!clientByName.user_id && user?.id) {
              await supabase
                .from('clients')
                .update({ 
                  user_id: user.id,
                  email: email || clientByName.email
                })
                .eq('id', clientByName.id);
              
              console.log(`Associated client ${clientByName.id} with user ${user.id}`);
            }
            
            await fetchContractsByClientId(clientByName.id);
            return;
          }
        }
        
        setLoading(false);
        setError("Aucun compte client trouvé pour cet email");
        return;
      }
      
      console.log("Found client:", clientData);
      
      // Si le client existe mais n'est pas associé à l'utilisateur actuel
      if (!clientData.user_id && user?.id) {
        console.log(`Associating client ${clientData.id} with user ${user.id}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: user.id })
          .eq('id', clientData.id);
          
        if (updateError) {
          console.error("Error updating client user_id:", updateError);
        } else {
          console.log(`Successfully associated client ${clientData.id} with user ${user.id}`);
        }
      } else if (clientData.user_id && clientData.user_id !== user?.id) {
        // Cas où le client est déjà associé à un autre utilisateur
        console.log(`Client ${clientData.id} is already associated with a different user: ${clientData.user_id}`);
        console.log(`Current user is: ${user?.id}`);
      }
      
      setClientId(clientData.id);
      
      if (user?.id) {
        localStorage.setItem(`client_id_${user.id}`, clientData.id);
      }
      
      // Maintenant récupérer les contrats avec cet ID client
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
      
      // Récupérer d'abord les contrats par client_id
      const { data: clientContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', id);
        
      if (contractsError) {
        console.error("Error fetching contracts by client_id:", contractsError);
        setLoading(false);
        setError(`Erreur lors de la récupération des contrats: ${contractsError.message}`);
        return;
      }
      
      console.log(`Retrieved ${clientContracts?.length || 0} contracts for client ${id}:`, clientContracts);
      
      // Si aucun contrat n'est trouvé par client_id, essayer par client_name
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
      // Obtenir d'abord le nom du client
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
      
      // Rechercher les contrats par nom de client
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
      
      // Si des contrats sont trouvés par nom
      if (nameContracts && nameContracts.length > 0) {
        console.log(`Found ${nameContracts.length} contracts by client_name:`, nameContracts);
        
        // Mettre à jour client_id pour ces contrats
        const updatedContracts = [];
        
        for (const contract of nameContracts) {
          // Créer une copie du contrat avec client_id mis à jour
          const updatedContract = { ...contract, client_id: clientId };
          updatedContracts.push(updatedContract);
          
          try {
            // Mettre à jour le contrat dans la base de données
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
        
        setContracts(updatedContracts);
      } else {
        console.log("No contracts found by client_name either");
        
        // Comme dernier recours, chercher dans toutes les offres du client
        try {
          const { data: offers, error: offersError } = await supabase
            .from('offers')
            .select('*')
            .eq('client_id', clientId)
            .eq('converted_to_contract', true);
            
          if (offersError) throw offersError;
            
          if (offers && offers.length > 0) {
            console.log(`Found ${offers.length} offers converted to contracts, checking for matching contracts`);
            
            // Pour chaque offre, vérifier s'il existe un contrat correspondant
            for (const offer of offers) {
              const { data: relatedContract, error: relatedError } = await supabase
                .from('contracts')
                .select('*')
                .eq('offer_id', offer.id)
                .maybeSingle();
                
              if (relatedError) {
                console.error(`Error checking contract for offer ${offer.id}:`, relatedError);
                continue;
              }
              
              if (relatedContract) {
                console.log(`Found contract ${relatedContract.id} for offer ${offer.id}`);
                
                // Si le contrat n'a pas de client_id, le mettre à jour
                if (!relatedContract.client_id) {
                  const updatedContract = { ...relatedContract, client_id: clientId };
                  
                  const { error: updateError } = await supabase
                    .from('contracts')
                    .update({ client_id: clientId })
                    .eq('id', relatedContract.id);
                    
                  if (updateError) {
                    console.error(`Error updating contract ${relatedContract.id}:`, updateError);
                  } else {
                    console.log(`Updated client_id for contract ${relatedContract.id}`);
                  }
                  
                  setContracts([updatedContract]);
                  break;
                } else {
                  setContracts([relatedContract]);
                  break;
                }
              }
            }
          }
        } catch (offersErr) {
          console.error("Error checking client offers:", offersErr);
        }
        
        if (contracts.length === 0) {
          setContracts([]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in tryFetchByClientName:", error);
      setLoading(false);
      setContracts([]);
    }
  };

  // Fonction de diagnostic pour les problèmes de recherche de contrats
  const runDiagnostics = async () => {
    try {
      console.log("Running contract diagnostics...");
      console.log("Current user:", user);
      console.log("Current clientId:", clientId);
      
      // Récupérer tous les clients
      const { data: allClients } = await supabase
        .from('clients')
        .select('*');
        
      console.log("All clients:", allClients);
      
      // Récupérer tous les contrats
      const { data: allContracts } = await supabase
        .from('contracts')
        .select('*');
        
      console.log("All contracts:", allContracts);
      
      // Trouver les correspondances potentielles
      if (allClients && allContracts && user?.email) {
        // Trouver le client correspondant à l'email de l'utilisateur
        const userClient = allClients.find(c => c.email === user.email);
        console.log("Client matching user email:", userClient);
        
        if (userClient) {
          // Trouver les contrats correspondant au nom du client
          const nameMatches = allContracts.filter(c => 
            c.client_name === userClient.name
          );
          console.log("Contracts matching by name:", nameMatches);
          
          // Trouver les contrats correspondant à l'ID du client
          const idMatches = allContracts.filter(c => 
            c.client_id === userClient.id
          );
          console.log("Contracts matching by ID:", idMatches);
          
          // Si des contrats sont trouvés par nom mais pas par ID
          if (nameMatches.length > 0 && idMatches.length === 0) {
            console.log("Found contracts by name but not by ID, correcting...");
            // Mettre à jour les contrats avec l'ID client correct
            for (const contract of nameMatches) {
              const { error } = await supabase
                .from('contracts')
                .update({ client_id: userClient.id })
                .eq('id', contract.id);
                
              if (error) {
                console.error(`Error updating contract ${contract.id}:`, error);
              } else {
                console.log(`Updated client_id for contract ${contract.id}`);
              }
            }
            
            // Rafraîchir les contrats après correction
            refresh();
          }
        }
      }
      
      // Vérifier également si des contrats sont disponibles pour le client actuellement consulté
      // (important pour la page de détail client)
      if (clientId && allContracts) {
        const currentClientIdMatches = allContracts.filter(c => c.client_id === clientId);
        console.log(`Contracts for currently viewed client (${clientId}):`, currentClientIdMatches);
      }
      
      toast.success("Diagnostic terminé, consultez la console");
      return { success: true };
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast.error("Erreur lors du diagnostic");
      return { success: false, error };
    }
  };

  useEffect(() => {
    if (user || clientId) {
      fetchContracts();
    }
  }, [user, retry]);

  const refresh = (forceClientId?: string) => {
    // Effacer le cache et réessayer
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
    debug: runDiagnostics, 
    fetchContracts
  };
};
