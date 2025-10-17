
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
  leaser_name?: string;
  business_sector?: string;
  total_purchase_price?: number;
  margin_percentage?: number;
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [includeConverted, setIncludeConverted] = useState(true);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);

    try {
      console.log("Fetching offers with includeConverted =", includeConverted);
      
      // Get current authenticated user for debugging
      const { data: authData } = await supabase.auth.getUser();
      console.log("Current user ID during fetch:", authData.user?.id);
      
      const data = await getOffers(includeConverted);
      
      if (data) {
        console.log(`Received ${data.length} offers from service`, data);
        
        // Process each offer to ensure financed_amount is calculated if not present
        // and enrich with leaser_name, business_sector, total_purchase_price, and margin_percentage
        const processedOffers = data.map(offer => {
          // Calculate total purchase price from equipment
          const totalPurchasePrice = offer.offer_equipment?.reduce(
            (sum: number, eq: any) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 
            0
          ) || 0;
          
          // Calculate average margin percentage from equipment
          const equipmentWithMargin = offer.offer_equipment?.filter((eq: any) => eq.margin != null) || [];
          const avgMarginPercentage = equipmentWithMargin.length > 0
            ? equipmentWithMargin.reduce((sum: number, eq: any) => sum + (eq.margin || 0), 0) / equipmentWithMargin.length
            : offer.margin || 0;
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
              financed_amount: calculatedAmount,
              leaser_name: offer.leasers?.name || null,
              business_sector: offer.clients?.business_sector || null,
              total_purchase_price: totalPurchasePrice,
              margin_percentage: avgMarginPercentage
            };
          }
          return {
            ...offer,
            leaser_name: offer.leasers?.name || null,
            business_sector: offer.clients?.business_sector || null,
            total_purchase_price: totalPurchasePrice,
            margin_percentage: avgMarginPercentage
          };
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
