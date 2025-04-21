
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOffers } from "@/services/offers/getOffers";
import { supabase } from "@/integrations/supabase/client";
import { calculateFinancedAmount } from "@/utils/calculator";

// Define and export the Offer interface
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
  [key: string]: any; // Pour les propriétés additionnelles
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
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
        
        // Traitement des offres pour s'assurer que toutes les propriétés requises sont présentes
        const processedOffers = data.map(offer => {
          // S'assurer que financed_amount est calculé si manquant
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
        
        // S'assurer que chaque offre a un champ created_at
        const validOffers = processedOffers.map(offer => ({
          ...offer,
          created_at: offer.created_at || new Date().toISOString(),
          monthly_payment: Number(offer.monthly_payment || 0)
        })) as Offer[];
        
        console.log(`${validOffers.length} offres traitées et prêtes à afficher`);
        setOffers(validOffers);
      } else {
        console.log("Aucune offre récupérée ou liste vide");
        setOffers([]);
      }
    } catch (err: any) {
      console.error("Erreur dans fetchOffers:", err);
      setLoadingError(err.message || "Erreur de connexion à Supabase");
      toast.error("Erreur lors du chargement des offres. Vérifiez la connexion à Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    
    // Écouter les mises à jour en temps réel
    const channel = supabase
      .channel('offers-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'offers' 
      }, () => {
        console.log('Modification d\'offre détectée, actualisation des offres...');
        fetchOffers();
      })
      .subscribe();
      
    // Rafraîchir automatiquement toutes les 15 secondes
    const refreshInterval = setInterval(() => {
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
