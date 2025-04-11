
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Interface pour les données d'offre
export interface CreateOfferData {
  client_id: string;
  client_name: string;
  client_email: string;
  equipment_description: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission?: number;
  financed_amount?: number;
  workflow_status: string;
  type: string;
  user_id: string;
  remarks?: string;
  total_margin_with_difference?: string;
  margin?: string;
}

/**
 * Crée une nouvelle offre dans la base de données
 * @param data Les données de l'offre à créer
 * @returns Les données de l'offre créée ou une erreur
 */
export const createOffer = async (data: CreateOfferData) => {
  try {
    // Vérifier que les champs obligatoires sont présents
    if (!data.client_id || !data.client_name || !data.equipment_description) {
      throw new Error("Données d'offre incomplètes");
    }

    console.log("Création d'une nouvelle offre avec les données:", {
      client_id: data.client_id,
      client_name: data.client_name,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      type: data.type
    });

    // Ajouter une valeur par défaut pour les champs facultatifs
    const offerData = {
      ...data,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      converted_to_contract: false,
    };

    // Insérer l'offre dans la base de données
    const { data: newOffer, error } = await supabase
      .from("offers")
      .insert(offerData)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création de l'offre:", error);
      throw error;
    }

    console.log("Offre créée avec succès:", newOffer.id);
    return { data: newOffer, error: null };
  } catch (error) {
    console.error("Erreur lors de la création de l'offre:", error);
    return { data: null, error };
  }
};
