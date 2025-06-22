
import { supabase } from "@/integrations/supabase/client";

export interface MinimalOfferData {
  client_name: string;
  client_email: string;
  equipment_description: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  company_id: string;
  user_id: string;
  type?: string;
  workflow_status?: string;
  status?: string;
  client_id?: string;
  commission?: number;
  financed_amount?: number;
  margin?: number;
  ambassador_id?: string;
  remarks?: string;
  total_margin_with_difference?: string;
}

export const createOfferNew = async (offerData: MinimalOfferData) => {
  try {
    console.log("=== NOUVEAU SERVICE CRÉATION OFFRE ===");
    console.log("Données reçues:", offerData);

    // Vérification stricte des champs obligatoires
    if (!offerData.company_id) {
      console.error("ERREUR: company_id manquant");
      throw new Error("company_id est obligatoire");
    }

    if (!offerData.user_id) {
      console.error("ERREUR: user_id manquant");
      throw new Error("user_id est obligatoire");
    }

    console.log("Validation OK, company_id:", offerData.company_id);
    console.log("Validation OK, user_id:", offerData.user_id);

    // Construction des données avec tous les champs
    const dataToInsert = {
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: offerData.amount,
      coefficient: offerData.coefficient,
      monthly_payment: offerData.monthly_payment,
      company_id: offerData.company_id,
      user_id: offerData.user_id,
      type: offerData.type || "internal_offer",
      workflow_status: offerData.workflow_status || "draft",
      status: offerData.status || "pending",
      client_id: offerData.client_id || null,
      commission: offerData.commission || 0,
      financed_amount: offerData.financed_amount || 0,
      margin: offerData.margin || 0,
      ambassador_id: offerData.ambassador_id || null,
      remarks: offerData.remarks || "",
      total_margin_with_difference: offerData.total_margin_with_difference ? 
        parseFloat(offerData.total_margin_with_difference) : 0
    };

    console.log("Données finales à insérer:", dataToInsert);

    // Insertion sans spécifier de colonnes
    const { data, error } = await supabase
      .from('offers')
      .insert(dataToInsert)
      .select();

    if (error) {
      console.error("ERREUR SUPABASE:", error);
      return { data: null, error };
    }

    console.log("SUCCÈS:", data);
    return { data, error: null };

  } catch (error) {
    console.error("ERREUR DANS createOfferNew:", error);
    return { data: null, error };
  }
};
