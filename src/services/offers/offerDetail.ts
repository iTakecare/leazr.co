
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
        console.log("Données de l'offre:", JSON.stringify(data, null, 2));
        
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
        
        // Si le montant financé est significativement différent de celui stocké, le mettre à jour
        // (nécessaire seulement pour les anciennes offres)
        if (Math.abs((data.financed_amount || 0) - financedAmount) > 1) {
          console.log(`Mise à jour du montant financé: ${data.financed_amount || 0}€ -> ${financedAmount}€`);
          data.financed_amount = financedAmount;
          
          // Mettre à jour le montant financé dans la base de données
          await supabase
            .from('offers')
            .update({ financed_amount: financedAmount })
            .eq('id', id);
        }
        
        // Pour maintenir la cohérence, ne pas recalculer la commission à l'affichage
        // Si elle est à 0 ou manquante, alors seulement la recalculer
        if (!data.commission || data.commission === 0) {
          console.log("Commission manquante ou à 0, recalcul nécessaire");
          
          // Récupérer le niveau de commission de l'ambassadeur
          const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('commission_level_id, name')
            .eq('id', data.ambassador_id)
            .single();

          if (ambassadorError) {
            console.error("Erreur lors de la récupération des données de l'ambassadeur:", ambassadorError);
          }

          // Utiliser l'ID du niveau de commission de l'ambassadeur ou obtenir le niveau par défaut
          let commissionLevelId = ambassador?.commission_level_id;
          
          if (!commissionLevelId) {
            console.log("Aucun niveau de commission trouvé pour l'ambassadeur, recherche du niveau par défaut");
            
            const { data: defaultLevel, error: defaultLevelError } = await supabase
              .from('commission_levels')
              .select('id')
              .eq('type', 'ambassador')
              .eq('is_default', true)
              .single();
              
            if (defaultLevelError) {
              console.error("Erreur lors de la recherche du niveau de commission par défaut:", defaultLevelError);
            } else if (defaultLevel) {
              commissionLevelId = defaultLevel.id;
              console.log("Niveau de commission par défaut utilisé:", commissionLevelId);
            }
          } else {
            console.log("Niveau de commission de l'ambassadeur trouvé:", commissionLevelId);
          }

          if (commissionLevelId) {
            // Calculer la commission basée sur le niveau de l'ambassadeur
            const commissionData = await calculateCommissionByLevel(
              financedAmount,
              commissionLevelId,
              'ambassador',
              data.ambassador_id
            );

            console.log("Données de commission calculées:", commissionData);
            
            // Mettre à jour la commission dans les données
            if (commissionData && typeof commissionData.amount === 'number') {
              // Mettre à jour la commission
              console.log(`Mise à jour de la commission: ${data.commission || 0}€ -> ${commissionData.amount}€`);
              data.commission = commissionData.amount;
              
              // Mettre à jour la commission dans la base de données
              const updateResult = await supabase
                .from('offers')
                .update({ commission: commissionData.amount })
                .eq('id', id);
                
              if (updateResult.error) {
                console.error("Erreur lors de la mise à jour de la commission:", updateResult.error);
              } else {
                console.log("Commission mise à jour dans la base de données");
              }
            }
          } else {
            console.error("Impossible de trouver un niveau de commission valide pour calculer la commission");
          }
        } else {
          console.log(`Commission déjà présente (${data.commission}€), pas de recalcul nécessaire`);
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
    console.log("Mise à jour de l'offre", id, "avec les données:", data);
    
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
    
    // Si la commission est fournie explicitement, ne pas la recalculer
    let shouldRecalculateCommission = false;
    
    // Calculer et ajouter le montant financé si nécessaire
    if (dataToSave.monthly_payment !== undefined && dataToSave.coefficient !== undefined) {
      const financedAmount = calculateFinancedAmount(
        Number(dataToSave.monthly_payment), 
        Number(dataToSave.coefficient || 3.27)
      );
      console.log(`Calcul du montant financé pour la mise à jour: ${financedAmount}€`);
      dataToSave.financed_amount = financedAmount;
      
      // Recalculer la commission seulement si elle n'est pas explicitement fournie
      shouldRecalculateCommission = dataToSave.commission === undefined;
      console.log(`Recalculer la commission? ${shouldRecalculateCommission}`);
    }
    
    // Si c'est une offre d'ambassadeur ET qu'on doit recalculer la commission
    if (shouldRecalculateCommission) {
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('type, ambassador_id')
        .eq('id', id)
        .single();
        
      if (!offerError && offerData && offerData.type === 'ambassador_offer' && offerData.ambassador_id) {
        console.log("Recalcul de la commission lors de la mise à jour");
        
        const { data: ambassador, error: ambassadorError } = await supabase
          .from('ambassadors')
          .select('commission_level_id')
          .eq('id', offerData.ambassador_id)
          .single();
          
        if (ambassadorError) {
          console.error("Erreur lors de la récupération du niveau de commission:", ambassadorError);
        }
        
        let commissionLevelId = ambassador?.commission_level_id;
        
        if (!commissionLevelId) {
          const { data: defaultLevel, error: defaultLevelError } = await supabase
            .from('commission_levels')
            .select('id')
            .eq('type', 'ambassador')
            .eq('is_default', true)
            .single();
            
          if (!defaultLevelError && defaultLevel) {
            commissionLevelId = defaultLevel.id;
          }
        }
        
        if (commissionLevelId && dataToSave.financed_amount) {
          const commissionData = await calculateCommissionByLevel(
            dataToSave.financed_amount,
            commissionLevelId,
            'ambassador',
            offerData.ambassador_id
          );
          
          if (commissionData && typeof commissionData.amount === 'number') {
            console.log("Nouvelle commission calculée:", commissionData.amount);
            console.log("Détails de calcul:", commissionData);
            dataToSave.commission = commissionData.amount;
          }
        }
      }
    }
    
    console.log("Données finales à sauvegarder:", dataToSave);
    
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
