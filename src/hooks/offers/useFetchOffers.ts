
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOffers } from "@/services/offers/getOffers";
import { supabase } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";
import { OfferData } from "@/services/offers/types";

// Define and export the Offer interface
export interface Offer extends OfferData {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  ambassador_id?: string;
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [includeConverted, setIncludeConverted] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);

    try {
      console.log("Fetching offers with includeConverted =", includeConverted);
      
      // Get current authenticated user for debugging
      const { data: authData } = await supabase.auth.getUser();
      console.log("Current user ID during fetch:", authData.user?.id);
      
      // Vérifions aussi l'offre spécifique mentionnée
      const { data: specificOffer, error: specificError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', '82375436-fb09-4d13-aad5-9a29dbe686f2')
        .single();
        
      if (specificError) {
        console.log("Error checking specific offer in hook:", specificError);
      } else if (specificOffer) {
        console.log("Found specific offer in hook:", specificOffer);
        console.log("  - converted_to_contract:", specificOffer.converted_to_contract);
        console.log("  - workflow_status:", specificOffer.workflow_status);
      }
      
      const data = await getOffers(includeConverted);
      
      if (data) {
        console.log(`Received ${data.length} offers from service`, data);
        
        // Process each offer to ensure financed_amount is calculated if not present
        const processedOffers = data.map(offer => {
          // If financed_amount is missing or zero but we have monthly_payment
          if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
            // Get coefficient - either from the offer or use a default of 3.27
            const coefficient = offer.coefficient || 3.27;
            
            // Calculate and add financed amount
            const calculatedAmount = calculateFinancedAmount(
              Number(offer.monthly_payment), 
              Number(coefficient)
            );
            
            console.log(`Calculated missing financed amount for offer ${offer.id}: ${calculatedAmount}€ (monthly: ${offer.monthly_payment}€, coef: ${coefficient})`);
            
            return {
              ...offer,
              financed_amount: calculatedAmount
            };
          }
          return offer;
        });
        
        // Ensure each offer has a created_at field even if it's missing
        const validOffers = processedOffers.map(offer => ({
          ...offer,
          created_at: offer.created_at || new Date().toISOString(),
          monthly_payment: Number(offer.monthly_payment)
        })) as Offer[];
        
        console.log(`After processing, we have ${validOffers.length} valid offers`);
        setOffers(validOffers);
      } else {
        console.log("No offers received from service, setting empty array");
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Error in fetchOffers:", err);
      setLoadingError(err.message || "Erreur lors du chargement des offres");
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useFetchOffers useEffect running - fetching offers");
    fetchOffers();
    
    // Listen for real-time updates
    const channel = supabase
      .channel('offers-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'offers' 
      }, (payload) => {
        console.log('Offer change detected:', payload);
        fetchOffers();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [includeConverted]);

  return {
    offers,
    loading,
    loadingError,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    setOffers
  };
};
