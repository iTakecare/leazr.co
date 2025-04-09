
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";

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
  financed_amount?: number;
  coefficient?: number;
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

      // Process the data to ensure financed_amount is calculated for all offers
      const processedData = (data || []).map(offer => {
        // If financed_amount is missing or zero but we have monthly_payment
        if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
          // Get coefficient - either from the offer or use a default of 3.27
          const coefficient = offer.coefficient || 3.27;
          
          // Calculate and add financed amount - ensure we're using numbers
          const calculatedAmount = calculateFinancedAmount(
            Number(offer.monthly_payment), 
            Number(coefficient)
          );
          
          console.log(`Calculated missing financed amount for client offer ${offer.id}: ${calculatedAmount}€ (monthly: ${offer.monthly_payment}€, coef: ${coefficient})`);
          
          return {
            ...offer,
            financed_amount: calculatedAmount
          };
        }
        return offer;
      });

      setOffers(processedData || []);
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
