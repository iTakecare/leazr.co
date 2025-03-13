
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

  useEffect(() => {
    const fetchClientId = async () => {
      if (!user?.email) return null;
      
      try {
        console.log("Fetching client ID for email:", user.email);
        const { data, error } = await supabase
          .from('clients')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (error) {
          console.error("Error fetching client ID:", error);
          return null;
        }
        
        if (data) {
          console.log("Found client ID:", data.id);
          setClientId(data.id);
          return data.id;
        }
      } catch (error) {
        console.error("Error in fetchClientId:", error);
      }
      
      return null;
    };

    const fetchClientOffers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const id = await fetchClientId();
        
        if (!id) {
          setLoading(false);
          setError("Compte client non trouvé");
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

    if (user?.email) {
      fetchClientOffers();
    }
  }, [user]);

  return {
    offers,
    loading,
    error,
    clientId,
    refresh: () => {
      setLoading(true);
      setOffers([]);
    }
  };
};
