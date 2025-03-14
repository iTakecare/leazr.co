
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ClientOffer = {
  id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  monthly_payment: number;
  equipment_description?: string;
  amount: number;
  coefficient: number;
  commission?: number;
  status?: string;
  created_at: string;
  updated_at: string;
  converted_to_contract: boolean;
};

export const useClientOffers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
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
        
        // Première tentative: chercher par email
        if (user.email) {
          const { data: dataByEmail, error: errorByEmail } = await supabase
            .from('clients')
            .select('id, user_id')
            .eq('email', user.email)
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
            localStorage.setItem(`client_id_${user.id}`, dataByUserId.id);
            setClientId(dataByUserId.id);
            return dataByUserId.id;
          } else {
            console.log("No client found for user_id:", user.id);
          }
        }
        
        // Cas spécial pour mistergi118@gmail.com
        if (user.email === "mistergi118@gmail.com") {
          console.log("Special check for mistergi118@gmail.com");
          
          // Récupérer tous les clients
          const { data: allClients, error: allClientsError } = await supabase
            .from('clients')
            .select('id, name, email, user_id');
            
          if (!allClientsError && allClients) {
            // Chercher un client avec le même email mais sans user_id
            const unlinkedClient = allClients.find(c => 
              c.email === user.email && (!c.user_id || c.user_id === null)
            );
              
            if (unlinkedClient) {
              console.log("Found unlinked client for mistergi118@gmail.com:", unlinkedClient);
              
              // Mettre à jour le client avec l'user_id
              const { error: updateError } = await supabase
                .from('clients')
                .update({ user_id: user.id })
                .eq('id', unlinkedClient.id);
                
              if (!updateError) {
                console.log("Successfully linked user to client:", unlinkedClient.id);
                localStorage.setItem(`client_id_${user.id}`, unlinkedClient.id);
                setClientId(unlinkedClient.id);
                return unlinkedClient.id;
              } else {
                console.error("Error linking user to client:", updateError);
              }
            } else {
              // Si aucun client n'est trouvé, créer un nouveau client
              console.log("No matching client found for mistergi118@gmail.com, creating a new one");
              
              const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert({
                  name: user.first_name || "Client " + user.email.split('@')[0],
                  email: user.email,
                  user_id: user.id,
                  status: 'active'
                })
                .select('id')
                .single();
                
              if (!createError && newClient) {
                console.log("Created new client for mistergi118@gmail.com:", newClient);
                toast.success("Un nouveau compte client a été créé pour vous");
                localStorage.setItem(`client_id_${user.id}`, newClient.id);
                setClientId(newClient.id);
                return newClient.id;
              } else {
                console.error("Error creating new client:", createError);
              }
            }
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

    const fetchClientOffers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const id = await fetchClientId();
        
        if (!id) {
          setLoading(false);
          setError("Compte client non trouvé. Veuillez contacter l'administrateur.");
          return;
        }
        
        console.log("Fetching offers for client ID:", id);
        
        const { data, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_id', id)
          .eq('converted_to_contract', false);
          
        if (offersError) {
          console.error("Error fetching offers:", offersError);
          setError("Erreur lors de la récupération des demandes");
          toast.error("Erreur lors du chargement des demandes");
        } else {
          console.log("Fetched offers:", data);
          setOffers(data || []);
        }
      } catch (error) {
        console.error("Error fetching client offers:", error);
        setError("Erreur lors de la récupération des demandes");
        toast.error("Erreur lors du chargement des demandes");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchClientOffers();
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
    setOffers([]);
    setRetry(prev => prev + 1);
  };

  return {
    offers,
    loading,
    error,
    clientId,
    refresh
  };
};
