
import { supabase } from "@/integrations/supabase/client";
import { OfferData, OfferType } from "./types";
import { calculateFinancedAmount } from "@/utils/calculator";

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
      commission: offerData.commission ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        null
    };

    // Pour les offres internes, s'assurer que la commission est à zéro
    if (offerData.type === OfferType.INTERNAL) {
      dataToSave.commission = 0;
      // Aussi s'assurer que le statut de commission est défini correctement
      dataToSave.commission_status = 'not_applicable';
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
    const { data, error } = await supabase.from('offers').insert([dataToSave]).select('*');

    if (error) throw error;

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
