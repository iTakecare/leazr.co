
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const supabase = getSupabaseClient();

export interface ClientOffer {
  id: string;
  client_name: string;
  client_email?: string;
  amount: number;
  monthly_payment: number;
  equipment_description?: string;
  created_at: string;
  status: string;
  workflow_status?: string;
  type: string;
  financed_amount?: number;
  coefficient?: number;
  signature_data?: string;
  signed_at?: string;
  signer_name?: string;
  equipment_data?: any[]; // Adding equipment_data property
  client_id?: string;
}

export const useClientOffers = (clientEmail?: string) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);

    try {
      // Si clientEmail est fourni, l'utiliser directement
      if (clientEmail) {
        await fetchOffersByEmail(clientEmail);
        return;
      }

      // Si l'utilisateur n'est pas connecté, afficher une erreur
      if (!user) {
        setLoading(false);
        setError("Utilisateur non connecté");
        return;
      }
      
      // Vérifier si un ID client existe déjà dans le localStorage
      if (user.id) {
        const cachedClientId = localStorage.getItem(`client_id_${user.id}`);
        if (cachedClientId) {
          console.log("Using cached client ID for offers:", cachedClientId);
          setClientId(cachedClientId);
          await fetchOffersByClientId(cachedClientId);
          return;
        }
      }

      // Sinon, essayer de trouver l'ID client à partir de l'email de l'utilisateur
      await findClientIdAndFetchOffers();

    } catch (err: any) {
      console.error("Erreur lors de la récupération des offres:", err);
      setError(err.message);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  const findClientIdAndFetchOffers = async () => {
    if (!user?.email) {
      console.error("Email de l'utilisateur non trouvé");
      setError("Email de l'utilisateur non trouvé");
      return;
    }

    // Rechercher le client par email
    let { data: client, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('email', user.email)
      .maybeSingle();

    // Si pas trouvé par email, essayer par user_id
    if (!client && user.id) {
      console.log("Client not found by email, trying by user_id");
      const { data: clientByUserId, error: userIdError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientByUserId) {
        client = clientByUserId;
      } else if (user.first_name && user.last_name) {
        // Essayer par nom complet si disponible
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        console.log("Trying to find client by name:", fullName);
        
        const { data: clientByName, error: nameError } = await supabase
          .from('clients')
          .select('id, name')
          .ilike('name', `%${fullName}%`)
          .maybeSingle();
          
        if (clientByName) {
          client = clientByName;
          
          // Associer l'utilisateur à ce client si pas déjà fait
          if (user.id) {
            await supabase
              .from('clients')
              .update({ 
                user_id: user.id,
                email: user.email || client.email 
              })
              .eq('id', client.id);
          }
        }
      }
    }

    if (client) {
      console.log("Client found:", client);
      setClientId(client.id);
      
      // Sauvegarder l'ID client dans le localStorage
      if (user.id) {
        localStorage.setItem(`client_id_${user.id}`, client.id);
      }
      
      await fetchOffersByClientId(client.id);
    } else {
      // Comme dernier recours, chercher les offres directement par client_email
      await fetchOffersByEmail(user.email);
    }
  };

  const fetchOffersByClientId = async (id: string) => {
    console.log("Fetching offers for client ID:", id);
    
    // Récupérer les offres par client_id
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offers by client_id:", error);
      throw error;
    }

    // Si pas d'offres trouvées par client_id, essayer de récupérer par client_name
    if (!data || data.length === 0) {
      await tryFetchByClientName(id);
    } else {
      processAndSetOffers(data);
    }
  };

  const fetchOffersByEmail = async (email: string) => {
    console.log("Fetching offers by client email:", email);
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offers by email:", error);
      throw error;
    }

    processAndSetOffers(data || []);
  };

  const tryFetchByClientName = async (clientId: string) => {
    // Obtenir le nom du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client name:", clientError);
      setOffers([]);
      return;
    }

    console.log("Looking for offers by client name:", client.name);
    
    // Récupérer les offres par client_name
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_name', client.name)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offers by client_name:", error);
      setOffers([]);
      return;
    }

    // Si des offres sont trouvées, mettre à jour leur client_id
    if (data && data.length > 0) {
      console.log(`Found ${data.length} offers by client_name, updating their client_id`);
      
      const updatedOffers = data.map(offer => ({
        ...offer,
        client_id: clientId
      }));

      // Mettre à jour les client_id dans la base de données
      for (const offer of data) {
        try {
          const { error: updateError } = await supabase
            .from('offers')
            .update({ client_id: clientId })
            .eq('id', offer.id);
            
          if (updateError) {
            console.error(`Error updating offer ${offer.id}:`, updateError);
          }
        } catch (e) {
          console.error(`Exception updating offer ${offer.id}:`, e);
        }
      }

      processAndSetOffers(updatedOffers);
    } else {
      setOffers([]);
    }
  };

  const processAndSetOffers = (offersData: any[]) => {
    // Traiter les données pour calculer financed_amount si nécessaire
    const processedData = (offersData || []).map(offer => {
      // Parser equipment_description si c'est une chaîne JSON
      let equipment_data = null;
      if (offer.equipment_description && typeof offer.equipment_description === 'string') {
        try {
          equipment_data = JSON.parse(offer.equipment_description);
        } catch (e) {
          console.log('Error parsing equipment data:', e);
        }
      }

      // Si financed_amount est manquant mais qu'on a monthly_payment
      if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
        const coefficient = offer.coefficient || 3.27;
        
        const calculatedAmount = calculateFinancedAmount(
          Number(offer.monthly_payment), 
          Number(coefficient)
        );
        
        return {
          ...offer,
          financed_amount: calculatedAmount,
          equipment_data: equipment_data
        };
      }
      return {
        ...offer,
        equipment_data: equipment_data
      };
    });

    setOffers(processedData);
  };

  useEffect(() => {
    fetchOffers();
  }, [clientEmail, retry]);

  const refresh = () => {
    // Effacer le cache et réessayer
    if (user?.id) {
      localStorage.removeItem(`client_id_${user.id}`);
    }
    setClientId(null);
    setRetry(prev => prev + 1);
  };

  return { offers, loading, error, refresh };
};
