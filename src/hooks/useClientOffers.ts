import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";

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
    const fetchClientOffers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!user) {
          setLoading(false);
          setError("Utilisateur non connecté");
          return;
        }
        
        const id = await getClientIdForUser(user.id, user.email || null);
        
        if (!id) {
          setLoading(false);
          setError("Compte client non trouvé. Veuillez contacter l'administrateur.");
          return;
        }
        
        setClientId(id);
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

    fetchClientOffers();
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
