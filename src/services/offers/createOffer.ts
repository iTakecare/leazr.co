
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("=== DÉBUT CRÉATION OFFRE ===");
    console.log("DONNÉES D'OFFRE REÇUES:", offerData);
    
    // Vérifier que l'utilisateur est bien authentifié AVANT tout
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Utilisateur non authentifié:", authError);
      throw new Error("Utilisateur non authentifié");
    }

    console.log("Utilisateur authentifié:", user.id);
    
    // VALIDATION STRICTE : S'assurer que company_id est présent
    if (!offerData.company_id) {
      console.error("ERREUR CRITIQUE: company_id manquant dans offerData:", offerData);
      throw new Error("company_id est obligatoire pour créer une offre");
    }
    
    console.log("Company ID validé:", offerData.company_id);
    
    // S'assurer que les valeurs numériques sont correctement converties
    const offerDataToSave = {
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      company_id: offerData.company_id, // EXPLICITEMENT INCLUS
      user_id: user.id,
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission !== undefined && offerData.commission !== null ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        0,
      margin: offerData.margin !== undefined && offerData.margin !== null ?
        (typeof offerData.margin === 'string' ? parseFloat(offerData.margin) : offerData.margin) :
        0,
      workflow_status: offerData.workflow_status || "draft",
      type: offerData.type || "internal_offer",
      remarks: offerData.remarks || "",
      total_margin_with_difference: offerData.total_margin_with_difference || "0"
    };

    // Calculer le montant financé si non défini
    if (!offerDataToSave.financed_amount && offerDataToSave.monthly_payment && offerDataToSave.coefficient) {
      offerDataToSave.financed_amount = parseFloat(
        (Number(offerDataToSave.monthly_payment) * Number(offerDataToSave.coefficient)).toFixed(2)
      );
      console.log("Montant financé calculé:", offerDataToSave.financed_amount);
    }

    // Calculer la marge si elle n'est pas définie mais qu'on a le montant et le montant financé
    if (!offerDataToSave.margin && offerDataToSave.amount && offerDataToSave.financed_amount) {
      const marginAmount = offerDataToSave.amount - offerDataToSave.financed_amount;
      const marginPercentage = (marginAmount / offerDataToSave.amount) * 100;
      offerDataToSave.margin = parseFloat(marginPercentage.toFixed(2));
      console.log("Marge calculée:", offerDataToSave.margin);
    }

    // Gestion des commissions pour les ambassadeurs
    if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, commission_level_id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerDataToSave.ambassador_id = ambassadorData.id;
        
        if (offerDataToSave.amount && ambassadorData.commission_level_id) {
          try {
            const amount = typeof offerDataToSave.amount === 'string' 
              ? parseFloat(offerDataToSave.amount) 
              : offerDataToSave.amount;
              
            const commissionData = await calculateCommissionByLevel(
              Number(amount),
              ambassadorData.commission_level_id,
              'ambassador',
              ambassadorData.id
            );
            
            if (commissionData && commissionData.amount) {
              offerDataToSave.commission = commissionData.amount;
              console.log(`Commission calculée pour l'ambassadeur: ${commissionData.amount}`);
            }
          } catch (commError) {
            console.error("Error calculating commission during offer creation:", commError);
          }
        }
      }
    }
    
    // Log des données finales AVANT insertion
    console.log("=== DONNÉES FINALES POUR INSERTION ===");
    console.log("Toutes les données à sauvegarder:", JSON.stringify(offerDataToSave, null, 2));
    
    // VALIDATION FINALE STRICTE
    if (!offerDataToSave.company_id) {
      console.error("ERREUR FATALE: company_id null après traitement");
      throw new Error("company_id null après traitement - abandon de la création");
    }
    if (!offerDataToSave.user_id) {
      console.error("ERREUR FATALE: user_id null après traitement");
      throw new Error("user_id null après traitement - abandon de la création");
    }
    
    console.log("=== ENVOI VERS SUPABASE ===");
    
    // Insertion simplifiée avec select('*') pour éviter les problèmes de colonnes
    const { data, error } = await supabase
      .from('offers')
      .insert(offerDataToSave)
      .select('*')
      .single();
    
    if (error) {
      console.error("=== ERREUR LORS DE L'INSERTION ===");
      console.error("Message d'erreur:", error.message);
      console.error("Code d'erreur:", error.code);
      console.error("Détails:", error.details);
      console.error("Hint:", error.hint);
      console.error("Données envoyées:", JSON.stringify(offerDataToSave, null, 2));
      return { data: null, error };
    }
    
    console.log("=== SUCCÈS ===");
    console.log("Offre créée avec succès:", data);
    return { data, error: null };
  } catch (error) {
    console.error("=== ERREUR DANS createOffer ===", error);
    return { data: null, error };
  }
};
