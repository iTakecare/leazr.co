
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";
import { useAuth } from "@/context/AuthContext";

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

export const useClientOffers = (clientEmail?: string) => {
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);

    try {
      let clientId = null;
      let userEmail = clientEmail || user?.email;
      
      // If we have a user with client_id, use that directly
      if (user?.client_id) {
        clientId = user.client_id;
        console.log("Using client ID from user context:", clientId);
      } else if (user?.id) {
        // Try to get client ID by user ID
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
          
        if (clientData) {
          clientId = clientData.id;
          console.log("Found client ID by user association:", clientId);
        }
      }
      
      // First attempt: Find by client_id if we have it
      let offers = [];
      
      if (clientId) {
        const { data: clientIdOffers, error: clientIdError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        
        if (clientIdError) {
          console.error("Error fetching offers by client ID:", clientIdError);
        } else if (clientIdOffers && clientIdOffers.length > 0) {
          console.log(`Found ${clientIdOffers.length} offers with client_id ${clientId}`);
          offers = clientIdOffers;
        } else {
          console.log(`No offers found with client_id ${clientId}`);
        }
      }
      
      // Second attempt: Find by client_email if no offers were found
      if (offers.length === 0 && userEmail) {
        const { data: emailOffers, error: emailError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_email', userEmail)
          .order('created_at', { ascending: false });
          
        if (emailError) {
          console.error("Error fetching offers by client email:", emailError);
        } else if (emailOffers && emailOffers.length > 0) {
          console.log(`Found ${emailOffers.length} offers with client_email ${userEmail}`);
          offers = emailOffers;
        } else {
          console.log(`No offers found with client_email ${userEmail}`);
        }
      }
      
      // Third attempt: Find by client_name if user has a name & no offers were found
      if (offers.length === 0 && user?.name) {
        const { data: nameOffers, error: nameError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_name', user.name)
          .order('created_at', { ascending: false });
          
        if (nameError) {
          console.error("Error fetching offers by client name:", nameError);
        } else if (nameOffers && nameOffers.length > 0) {
          console.log(`Found ${nameOffers.length} offers with client_name ${user.name}`);
          offers = nameOffers;
        } else {
          console.log(`No offers found with client_name ${user.name}`);
        }
      }
      
      // Process the data to ensure financed_amount is calculated for all offers
      const processedData = (offers || []).map(offer => {
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
  }, [clientEmail, user]);

  const refresh = () => {
    fetchOffers();
  };

  return { offers, loading, error, refresh };
};
