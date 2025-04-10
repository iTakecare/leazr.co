import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Offer {
  id: string;
  client_name: string;
  client_email: string;
  equipment_description: string;
  monthly_payment: number;
  amount?: number;
  workflow_status: string;
  created_at: string;
  type?: string;
  ambassador_name?: string;
  converted_to_contract?: boolean;
  signature_data?: string;
  signed_at?: string;
  clients?: {
    company?: string;
    email?: string;
  };
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [includeConverted, setIncludeConverted] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, clients(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching offers:", error);
        setLoadingError("Failed to load offers. Please try again.");
      } else {
        setOffers(data || []);
      }
    } catch (error) {
      console.error("Unexpected error fetching offers:", error);
      setLoadingError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return {
    offers,
    setOffers,
    loading,
    loadingError,
    includeConverted,
    setIncludeConverted,
    fetchOffers
  };
};

