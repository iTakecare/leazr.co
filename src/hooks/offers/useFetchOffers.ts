
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOffers } from "@/services/offers/getOffers";
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
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
  const [lastFetchAttempt, setLastFetchAttempt] = useState(Date.now());
  const [fetchCount, setFetchCount] = useState(0);

  const fetchOffers = async (useAdmin: boolean = false) => {
    setLoading(true);
    setLoadingError(null);
    setLastFetchAttempt(Date.now());
    setFetchCount(prev => prev + 1);

    try {
      console.log(`Démarrage de la récupération des offres... (useAdmin: ${useAdmin}, tentative: ${fetchCount + 1})`);
      
      const data = await getOffers(includeConverted);
      
      if (data && data.length > 0) {
        console.log(`${data.length} offres récupérées, traitement en cours...`);
        
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
          created_at: offer.created_at || new Date().toISOString(),
          monthly_payment: Number(offer.monthly_payment)
        })) as Offer[];
        
        console.log(`${validOffers.length} offres traitées et prêtes à afficher`);
        setOffers(validOffers);
      } else {
        console.log("Aucune offre récupérée ou liste vide");
        
        if (!useAdmin) {
          console.log("Tentative avec le client admin...");
          return fetchOffers(true);
        }
        
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Erreur dans fetchOffers:", err);
      setLoadingError(err.message || "Erreur de connexion");
      
      if (!useAdmin) {
        console.log("Tentative avec le client admin après erreur...");
        return fetchOffers(true);
      }
      
      toast.error("Erreur lors du chargement des offres. Vérifiez les permissions d'accès aux données.");
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
      }, (payload) => {
        console.log('Modification d\'offre détectée:', payload);
        console.log('Actualisation des offres...');
        fetchOffers();
      })
      .subscribe((status) => {
        console.log('Statut de souscription au canal realtime:', status);
      });
      
    // Refresh automatically every 15 seconds
    const refreshInterval = setInterval(() => {
      console.log("Rafraîchissement automatique des offres...");
      fetchOffers();
    }, 15000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [includeConverted]);

  return {
    offers,
    loading,
    loadingError,
    includeConverted,
    setIncludeConverted,
    fetchOffers: () => fetchOffers(false),
    setOffers,
    lastFetchAttempt,
    fetchCount
  };
};
