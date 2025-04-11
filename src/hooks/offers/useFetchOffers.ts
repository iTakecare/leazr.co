
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAllOffers } from "@/services/offers";
import { supabase } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";
import { OfferData } from "@/services/offers/types";

// Define and export the Offer interface
export interface Offer {
  id: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  client_company?: string;
  equipment_description?: string;
  amount?: number;
  monthly_payment: number;
  coefficient?: number;
  commission?: number;
  commission_status?: string;
  commission_paid_at?: string;
  ambassador_id?: string;
  ambassador_name?: string;
  type?: string;
  workflow_status?: string;
  status?: string;
  remarks?: string;
  additional_info?: string;
  user_id?: string;
  converted_to_contract?: boolean;
  financed_amount?: number;
  created_at: string;
  clients?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
  };
  signature_data?: string;
  signer_name?: string;
  signed_at?: string;
  signer_ip?: string;
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
      console.log("Début de la récupération des offres...");
      const { data, error } = await getAllOffers(includeConverted);
      
      if (error) {
        console.error("Error fetching offers:", error);
        setLoadingError(error.message || "Erreur lors du chargement des offres");
        toast.error("Erreur lors du chargement des offres");
        return;
      }
      
      if (data) {
        console.log(`${data.length} offres récupérées avec succès`);
        
        // Process each offer to ensure financed_amount is calculated if not present
        const processedOffers = data.map(offer => {
          // If financed_amount is missing or zero but we have monthly_payment
          if ((!offer.financed_amount || offer.financed_amount === 0) && offer.monthly_payment) {
            // Get coefficient - either from the offer or use a default of 3.27
            const coefficient = offer.coefficient || 3.27;
            
            // Calculate and add financed amount
            // We need to ensure we're passing a number to calculateFinancedAmount
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
          created_at: offer.created_at || new Date().toISOString()
        })) as Offer[];
        
        setOffers(validOffers);
      } else {
        console.log("Aucune offre trouvée");
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Error in fetchOffers:", err);
      setLoadingError(err.message || "Erreur inconnue lors du chargement des offres");
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useFetchOffers: chargement initial des offres");
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
