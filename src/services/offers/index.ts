
import { supabase } from "@/integrations/supabase/client";
import { OfferData, OfferType } from "./types";
import { calculateFinancedAmount } from "@/utils/calculator";
import { hasCommission } from "@/utils/offerTypeTranslator";

// Fonction pour créer une offre
export const createOffer = async (offerData: Partial<OfferData>): Promise<{ data?: any; error?: any }> => {
  try {
    // For debugging purposes, log all commission-related data
    console.log("Commission data received:", {
      rawCommission: offerData.commission,
      type: typeof offerData.commission,
      offerType: offerData.type
    });

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
      commission: offerData.commission !== undefined && offerData.commission !== null ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        null
    };

    // Log the commission value being saved
    console.log(`Commission value being saved: ${dataToSave.commission}€ (type: ${typeof dataToSave.commission})`);

    // Priorité à la commission fournie dans les données d'entrée
    if (offerData.commission !== undefined && offerData.commission !== null) {
      // Vérification supplémentaire pour s'assurer que commission n'est pas NaN
      if (isNaN(Number(dataToSave.commission))) {
        console.warn("Commission invalide détectée (NaN), définition à 0");
        dataToSave.commission = 0;
      } else {
        console.log(`Commission explicite utilisée: ${dataToSave.commission}€`);
      }
    }
    // Pour les offres internes ou types sans commission, s'assurer que la commission est à zéro
    else if (offerData.type === 'internal_offer' || !hasCommission(offerData.type)) {
      dataToSave.commission = 0;
      console.log("Type d'offre sans commission, valeur fixée à 0");
    }

    // Vérification supplémentaire pour s'assurer que commission n'est pas undefined
    if (dataToSave.commission === undefined) {
      console.warn("Commission undefined détectée, définition à 0");
      dataToSave.commission = 0;
    }

    // Calculer et ajouter le montant financé
    if (dataToSave.monthly_payment && dataToSave.coefficient) {
      const financedAmount = calculateFinancedAmount(
        Number(dataToSave.monthly_payment),
        Number(dataToSave.coefficient || 3.27)
      );
      console.log(`Calcul du montant financé pour la création: ${financedAmount}€`);
      dataToSave.financed_amount = financedAmount;
    } else if (dataToSave.monthly_payment) {
      // Si nous avons seulement la mensualité mais pas le coefficient, utiliser la valeur par défaut 3.27
      const defaultCoefficient = 3.27;
      console.log(`Aucun coefficient fourni, utilisation de la valeur par défaut: ${defaultCoefficient}`);
      
      const financedAmount = calculateFinancedAmount(
        Number(dataToSave.monthly_payment),
        defaultCoefficient
      );
      
      console.log(`Calcul du montant financé avec coefficient par défaut: ${financedAmount}€`);
      dataToSave.financed_amount = financedAmount;
      
      // Définir également le coefficient par défaut dans les données à sauvegarder
      if (!dataToSave.coefficient) {
        dataToSave.coefficient = defaultCoefficient;
      }
    }

    console.log("Création d'une nouvelle offre avec les données:", dataToSave);
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
