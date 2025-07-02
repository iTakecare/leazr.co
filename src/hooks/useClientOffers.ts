
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";

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
}

export const useClientOffers = (clientEmail?: string, clientId?: string | null) => {
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching offers for:", clientEmail, clientId);
      
      let query = supabase
        .from('offers')
        .select('*')
        .eq('converted_to_contract', false) // Exclure les offres converties en contrats
        .order('created_at', { ascending: false });

      // Apply filters based on available parameters
      if (clientId) {
        // If clientId is provided, filter by client_id
        console.log("Filtering offers by client_id:", clientId);
        query = query.eq('client_id', clientId);
      } else if (clientEmail) {
        // If only email is provided, filter by client_email
        console.log("Filtering offers by client_email:", clientEmail);
        query = query.eq('client_email', clientEmail);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Retrieved ${data?.length || 0} offers for client`, data);

      // Process the data to ensure financed_amount is calculated for all offers
      const processedData = (data || []).map(offer => {
        // Parse equipment_description if it's a JSON string
        let equipment_data = null;
        if (offer.equipment_description && typeof offer.equipment_description === 'string') {
          try {
            equipment_data = JSON.parse(offer.equipment_description);
          } catch (e) {
            console.log('Error parsing equipment data:', e);
          }
        }

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
            financed_amount: calculatedAmount,
            equipment_data: equipment_data
          };
        }
        return {
          ...offer,
          equipment_data: equipment_data
        };
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
  }, [clientEmail, clientId]);

  const refresh = () => {
    fetchOffers();
  };

  return { offers, loading, error, refresh };
};
