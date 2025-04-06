
import { supabase } from "@/integrations/supabase/client";
import { OfferData, OfferType } from "./types";
import { calculateFinancedAmount } from "@/utils/calculator";
import { hasCommission } from "@/utils/offerTypeTranslator";

// Fonction pour créer une offre
export const createOffer = async (offerData: Partial<OfferData>): Promise<{ data?: any; error?: any }> => {
  try {
    // Convertir les valeurs numériques si nécessaire
    const dataToSave = {
      ...offerData,
      amount: offerData.amount ? 
        (typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount) : 
        null,
      coefficient: offerData.coefficient ? 
        (typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient) : 
        null,
      monthly_payment: offerData.monthly_payment ? 
        (typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment) : 
        null,
      commission: offerData.commission !== undefined ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        null
    };

    // Log the commission value for debugging
    console.log(`Commission value being saved: ${dataToSave.commission}€`, typeof dataToSave.commission);

    // Ensure commission is always a number or null, not undefined
    if (dataToSave.commission === undefined) {
      // If undefined, set a default based on type
      if (offerData.type === 'internal_offer' || !hasCommission(offerData.type as OfferType)) {
        dataToSave.commission = 0;
        console.log("Type d'offre sans commission, valeur fixée à 0");
      } else if (dataToSave.monthly_payment) {
        // Default fallback calculation (3% of monthly payment * 36)
        dataToSave.commission = Number(dataToSave.monthly_payment) * 0.03 * 36;
        console.log(`Commission calculée par défaut: ${dataToSave.commission}€`);
      }
    }

    // Calculer et ajouter le montant financé
    if (dataToSave.monthly_payment && dataToSave.coefficient) {
      const financedAmount = calculateFinancedAmount(
        Number(dataToSave.monthly_payment),
        Number(dataToSave.coefficient || 3.27)
      );
      console.log(`Calcul du montant financé pour la création: ${financedAmount}€`);
      dataToSave.financed_amount = financedAmount;
    }

    console.log("Création d'une nouvelle offre avec les données:", dataToSave);
    
    // Make sure to sanitize null values that should be 0
    if (dataToSave.commission === null || dataToSave.commission === undefined || isNaN(Number(dataToSave.commission))) {
      dataToSave.commission = 0;
      console.log("Commission sanitized to 0 from null/undefined/NaN");
    }
    
    const { data, error } = await supabase.from('offers').insert([dataToSave]).select('*');

    if (error) {
      console.error("Erreur lors de l'insertion:", error);
      throw error;
    }

    console.log("Offre créée avec succès:", data[0]);
    return { data: data[0] };
  } catch (error) {
    console.error("Erreur lors de la création de l'offre:", error);
    return { error };
  }
};

export const getAllOffers = async (): Promise<{ data: OfferData[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*');

    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Erreur lors de la récupération des offres:", error);
    return { data: null, error };
  }
};
