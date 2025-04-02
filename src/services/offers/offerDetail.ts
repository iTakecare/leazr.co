
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const getOfferById = async (id: string): Promise<OfferData | null> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Si c'est une offre d'ambassadeur, recalculer la commission
    if (data && data.type === 'ambassador_offer' && data.ambassador_id) {
      try {
        // Extraire les données d'équipement pour le calcul
        let equipmentData = [];
        try {
          if (data.equipment_description) {
            equipmentData = typeof data.equipment_data === 'object' ? 
              data.equipment_data : 
              JSON.parse(data.equipment_description);
          }
        } catch (e) {
          console.log("Erreur de parsing des données d'équipement:", e);
        }

        // Calculer le montant total des équipements
        const totalEquipmentAmount = equipmentData.reduce((sum, eq) => {
          return sum + (eq.purchasePrice * eq.quantity);
        }, 0) || data.amount;

        // Récupérer le niveau de commission de l'ambassadeur
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('commission_level_id')
          .eq('id', data.ambassador_id)
          .single();

        if (ambassador?.commission_level_id) {
          // Calculer la commission basée sur le niveau de l'ambassadeur
          const commissionData = await calculateCommissionByLevel(
            totalEquipmentAmount,
            ambassador.commission_level_id,
            'ambassador',
            data.ambassador_id
          );

          // Mettre à jour la commission dans les données
          if (commissionData && commissionData.amount) {
            data.commission = commissionData.amount;
            
            // Optionnel: mettre à jour la commission dans la base de données
            await supabase
              .from('offers')
              .update({ commission: commissionData.amount })
              .eq('id', id);
          }
        }
      } catch (commError) {
        console.error("Erreur lors du calcul de la commission:", commError);
      }
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'offre:", error);
    toast.error("Erreur lors du chargement de l'offre");
    return null;
  }
};

export const updateOffer = async (id: string, data: Partial<OfferData>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'offre:", error);
    toast.error("Erreur lors de la mise à jour de l'offre");
    return false;
  }
};
