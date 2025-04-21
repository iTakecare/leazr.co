
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOffers } from "@/services/offers/getOffers";
import { supabase } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";

// Define and export Offer interface
export interface Offer {
  id: string;
  client_name: string;
  monthly_payment: number;
  created_at: string;
  ambassador_id?: string;
  amount: number;
  status: string;
  workflow_status?: string;
  client_id?: string;
  client_email?: string;
  equipment_description?: string;
  converted_to_contract?: boolean;
  financed_amount?: number;
  signature_data?: string;
  type?: string;
  [key: string]: any; // For additional properties
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [includeConverted, setIncludeConverted] = useState(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState(Date.now());
  const [fetchCount, setFetchCount] = useState(0);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    setLastFetchAttempt(Date.now());
    setFetchCount(prev => prev + 1);

    try {
      console.log(`Attempt #${fetchCount + 1} to retrieve offers...`);
      
      const data = await getOffers(includeConverted);
      
      if (data && data.length > 0) {
        console.log(`${data.length} offers retrieved, processing...`);
        
        // Process offers to calculate financed_amount if missing
        const processedOffers = data.map(offer => {
          if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
            const coefficient = offer.coefficient || 3.27;
            const calculatedAmount = calculateFinancedAmount(
              Number(offer.monthly_payment), 
              Number(coefficient)
            );
            return {
              ...offer,
              financed_amount: calculatedAmount
            };
          }
          return offer;
        });
        
        // Ensure each offer has a created_at field
        const validOffers = processedOffers.map(offer => ({
          ...offer,
          created_at: offer.created_at || new Date().toISOString(),
          monthly_payment: Number(offer.monthly_payment || 0)
        })) as Offer[];
        
        console.log(`${validOffers.length} offers processed and ready to display`);
        setOffers(validOffers);
      } else {
        console.log("No offers retrieved or empty list");
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Error retrieving offers:", err);
      setLoadingError(err.message || "Error connecting to Supabase");
      toast.error("Error loading offers. Check Supabase connection.");
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
        console.log('Offer modification detected, refreshing...');
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
    setOffers,
    lastFetchAttempt,
    fetchCount
  };
};
