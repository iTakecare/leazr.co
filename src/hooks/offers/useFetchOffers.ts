
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Offer {
  id: string;
  client_name: string;
  client_id?: string;
  amount: number;
  monthly_payment: number;
  commission?: number;
  workflow_status: string;
  equipment_description?: string;
  created_at: string;
  user_id: string;
  type: string;
  converted_to_contract: boolean;
  ambassador_id?: string;
  ambassador_name?: string;
  margin?: number;
  financed_amount?: number;
  coefficient?: number;
  margin_difference?: number; // Ajout du champ pour la différence de marge
  total_margin_with_difference?: number; // Ajout du champ pour la marge totale avec différence
  clients?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
  };
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [includeConverted, setIncludeConverted] = useState(false);
  
  const fetchOffers = async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      
      let query = supabase
        .from('offers')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            email,
            company
          )
        `)
        .order('created_at', { ascending: false });
      
      // Si on ne veut pas inclure les offres converties en contrat
      if (!includeConverted) {
        query = query.eq('converted_to_contract', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Si nous avons des offres d'ambassadeurs, récupérer les informations des ambassadeurs
      const transformedOffers = await Promise.all((data || []).map(async (offer) => {
        let ambassador_name = null;
        
        // Si c'est une offre d'ambassadeur et qu'on a un ID d'ambassadeur
        if (offer.type === 'ambassador_offer' && offer.ambassador_id) {
          try {
            const { data: ambassadorData, error: ambassadorError } = await supabase
              .from('ambassadors')
              .select('name')
              .eq('id', offer.ambassador_id)
              .single();
              
            if (!ambassadorError && ambassadorData) {
              ambassador_name = ambassadorData.name;
            }
          } catch (err) {
            console.error("Erreur lors de la récupération de l'ambassadeur:", err);
          }
        }

        // Traitement pour extraire la différence de marge et la marge totale depuis equipment_description
        let margin_difference = 0;
        let total_margin_with_difference = 0;

        if (offer.equipment_description) {
          try {
            // Tenter de parser la description de l'équipement
            const equipmentData = JSON.parse(offer.equipment_description);
            
            // Vérifier si nous avons des informations de marge supplémentaires
            if (typeof equipmentData === 'object' && equipmentData.marginDifference !== undefined) {
              margin_difference = equipmentData.marginDifference;
              
              // Calculer la marge totale avec différence si ce n'est pas déjà défini
              if (equipmentData.totalMarginWithDifference !== undefined) {
                total_margin_with_difference = equipmentData.totalMarginWithDifference;
              } else if (offer.margin !== undefined) {
                total_margin_with_difference = offer.margin + margin_difference;
              }
            }
          } catch (err) {
            // En cas d'erreur de parsing, nous continuons sans ces informations supplémentaires
            console.log("Information de marge supplémentaire non disponible dans l'equipment_description");
          }
        }
        
        return {
          ...offer,
          ambassador_name,
          margin_difference,
          total_margin_with_difference
        };
      }));
      
      setOffers(transformedOffers);
    } catch (error: any) {
      console.error("Error fetching offers:", error);
      setLoadingError(`Erreur lors du chargement des offres: ${error.message}`);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOffers();
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
