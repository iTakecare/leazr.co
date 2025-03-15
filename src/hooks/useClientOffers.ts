
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();

export interface ClientOffer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  equipment_description?: string;
  created_at: string;
  status: string;
  workflow_status?: string;
  type: string;
}

export const useClientOffers = (includeActive = true) => {
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('offers')
        .select('*')
        .eq('type', 'client_request')
        .order('created_at', { ascending: false });

      if (!includeActive) {
        query = query.eq('converted_to_contract', false);
      }

      const { data, error } = await query;

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
  }, [includeActive]);

  const refresh = () => {
    fetchOffers();
  };

  return { offers, loading, error, refresh };
};
