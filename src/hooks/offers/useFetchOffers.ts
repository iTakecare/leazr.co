
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAllOffers } from "@/services/offers";
import { supabase } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [includeConverted, setIncludeConverted] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);

    try {
      const { data, error } = await getAllOffers();
      
      if (error) {
        console.error("Error fetching offers:", error);
        setLoadingError(error);
        toast.error("Erreur lors du chargement des offres");
        return;
      }
      
      if (data) {
        // Process each offer to ensure financed_amount is calculated if not present
        const processedOffers = data.map(offer => {
          // If financed_amount is missing or zero but we have monthly_payment
          if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
            // Get coefficient - either from the offer or use a default of 3.27
            const coefficient = offer.coefficient || 3.27;
            
            // Calculate and add financed amount
            const calculatedAmount = calculateFinancedAmount(offer.monthly_payment, coefficient);
            
            console.log(`Calculated missing financed amount for offer ${offer.id}: ${calculatedAmount}€ (monthly: ${offer.monthly_payment}€, coef: ${coefficient})`);
            
            return {
              ...offer,
              financed_amount: calculatedAmount
            };
          }
          return offer;
        });
        
        setOffers(processedOffers);
      } else {
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Error in fetchOffers:", err);
      setLoadingError(err);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    
    // Listen for real-time updates
    const channel = supabase
      .channel('offers-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'offers' 
      }, () => {
        console.log('Offer change detected, refreshing...');
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
