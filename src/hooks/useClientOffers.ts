
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();

// Assurez-vous que le type ClientOffer inclut les champs status et workflow_status
export interface ClientOffer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  equipment_description?: string;
  created_at: string;
  status: string;
  workflow_status?: string;
}

export const useClientOffers = () => {
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setOffers(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur lors de la récupération des offres:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const refresh = () => {
    fetchOffers();
  };

  return { offers, loading, error, refresh };
};
