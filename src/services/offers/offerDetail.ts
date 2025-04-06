
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferData } from "./types";
import { calculateCommissionByLevel, calculateFinancedAmount } from "@/utils/calculator";

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
        console.log("Recalcul de la commission pour l'offre d'ambassadeur", data.id);
        
        // Extraire les données d'équipement pour le calcul
        let equipmentData = [];
        try {
          if (data.equipment_description) {
            equipmentData = typeof data.equipment_data === 'object' ? 
              data.equipment_data : 
              JSON.parse(data.equipment_description);
          }
        } catch (e) {
          console.error("Erreur de parsing des données d'équipement:", e);
        }

        // Application stricte de la formule pour le calcul du montant financé
        // Montant financé = (Mensualité × 100) ÷ Coefficient
        const financedAmount = calculateFinancedAmount(
          Number(data.monthly_payment), 
          Number(data.coefficient || 3.27)
        );
        
        console.log("Montant financé calculé:", financedAmount);
        
        // Si le montant financé est différent de celui stocké, le mettre à jour
        if (data.financed_amount !== financedAmount) {
          console.log(`Mise à jour du montant financé: ${data.financed_amount || 0}€ -> ${financedAmount}€`);
          data.financed_amount = financedAmount;
          
          // Mettre à jour le montant financé dans la base de données
          await supabase
            .from('offers')
            .update({ financed_amount: financedAmount })
            .eq('id', id);
        }
        
        // Récupérer le niveau de commission de l'ambassadeur
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('commission_level_id')
          .eq('id', data.ambassador_id)
          .single();

        if (ambassador?.commission_level_id) {
          console.log("Niveau de commission trouvé:", ambassador.commission_level_id);
          
          // Calculer la commission basée sur le niveau de l'ambassadeur
          const commissionData = await calculateCommissionByLevel(
            financedAmount,
            ambassador.commission_level_id,
            'ambassador',
            data.ambassador_id
          );

          console.log("Données de commission calculées:", commissionData);
          
          // Mettre à jour la commission dans les données
          if (commissionData && typeof commissionData.amount === 'number') {
            // Vérifier si la commission a changé
            if (Math.abs((data.commission || 0) - commissionData.amount) > 0.01) {
              console.log(`Mise à jour de la commission: ${data.commission || 0}€ -> ${commissionData.amount}€`);
              data.commission = commissionData.amount;
              
              // Mettre à jour la commission dans la base de données
              await supabase
                .from('offers')
                .update({ commission: commissionData.amount })
                .eq('id', id);
            }
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

export const updateOffer = async (id: string, data: Partial<OfferData>): Promise<{data?: any, error?: any}> => {
  try {
    // Ensure numeric values are properly converted for database storage
    const dataToSave: Partial<OfferData> = {
      ...data,
      amount: data.amount !== undefined ? 
        (typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount) : 
        undefined,
      coefficient: data.coefficient !== undefined ? 
        (typeof data.coefficient === 'string' ? parseFloat(data.coefficient) : data.coefficient) : 
        undefined,
      monthly_payment: data.monthly_payment !== undefined ? 
        (typeof data.monthly_payment === 'string' ? parseFloat(data.monthly_payment) : data.monthly_payment) : 
        undefined,
      commission: data.commission !== undefined ? 
        (typeof data.commission === 'string' ? parseFloat(data.commission) : data.commission) : 
        undefined
    };
    
    // Calculer et ajouter le montant financé si nécessaire
    if (dataToSave.monthly_payment !== undefined && dataToSave.coefficient !== undefined) {
      const financedAmount = calculateFinancedAmount(
        Number(dataToSave.monthly_payment), 
        Number(dataToSave.coefficient || 3.27)
      );
      console.log(`Calcul du montant financé pour la mise à jour: ${financedAmount}€`);
      dataToSave.financed_amount = financedAmount;
    }
    
    const result = await supabase
      .from('offers')
      .update(dataToSave)
      .eq('id', id);
    
    if (result.error) {
      console.error("Erreur lors de la mise à jour de l'offre:", result.error);
      toast.error("Erreur lors de la mise à jour de l'offre");
    } else {
      console.log("Offre mise à jour avec succès:", id);
    }
    
    return result;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'offre:", error);
    toast.error("Erreur lors de la mise à jour de l'offre");
    return { error };
  }
};
