
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("DONNÉES D'OFFRE REÇUES:", offerData);
    
    // Vérifier que l'utilisateur est bien authentifié AVANT tout
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Utilisateur non authentifié:", authError);
      throw new Error("Utilisateur non authentifié");
    }

    console.log("Utilisateur authentifié:", user.id);
    
    // Récupérer le company_id directement depuis le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.company_id) {
      console.error("Impossible de récupérer le company_id:", profileError);
      throw new Error("Impossible de récupérer l'ID de l'entreprise. Veuillez vous reconnecter.");
    }

    const companyId = profile.company_id;
    console.log("Company ID récupéré depuis le profil:", companyId);
    
    // S'assurer que les valeurs numériques sont correctement converties
    const offerDataToSave = {
      ...offerData,
      company_id: companyId, // Utiliser le company_id récupéré
      user_id: user.id, // S'assurer que user_id est défini
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission !== undefined && offerData.commission !== null ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined,
      margin: offerData.margin !== undefined && offerData.margin !== null ?
        (typeof offerData.margin === 'string' ? parseFloat(offerData.margin) : offerData.margin) :
        undefined
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

    // Vérification pour commission invalide (NaN)
    if (offerDataToSave.commission !== undefined && isNaN(Number(offerDataToSave.commission))) {
      console.warn("Commission invalide détectée (NaN), définition à 0");
      offerDataToSave.commission = 0;
    }

    // Si la commission est déjà définie et non nulle, nous utilisons cette valeur
    if (offerDataToSave.commission !== undefined && offerDataToSave.commission !== null) {
      console.log(`Utilisation de la commission fournie explicitement: ${offerDataToSave.commission}`);
    }
    // Sinon, essayons de calculer la commission en fonction du type d'offre
    else if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      // Récupérer l'ambassador_id associé à cet utilisateur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, commission_level_id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerDataToSave.ambassador_id = ambassadorData.id;
        
        // Si nous avons un montant et un niveau de commission, recalculons la commission
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
    
    // Si le type est client_request, s'assurer que toutes les informations financières sont renseignées
    if (offerData.type === 'client_request' || offerData.type === 'product_request') {
      if (offerData.equipment && Array.isArray(offerData.equipment)) {
        offerDataToSave.equipment_description = JSON.stringify(offerData.equipment);
      }
      
      console.log("Demande client, données finales:", {
        amount: offerDataToSave.amount,
        coefficient: offerDataToSave.coefficient,
        monthly_payment: offerDataToSave.monthly_payment,
        financed_amount: offerDataToSave.financed_amount,
        margin: offerDataToSave.margin,
        company_id: offerDataToSave.company_id
      });
    }
    
    // Log des données finales AVANT insertion
    console.log("=== DONNÉES FINALES POUR INSERTION ===");
    console.log("company_id:", offerDataToSave.company_id);
    console.log("user_id:", offerDataToSave.user_id);
    console.log("client_id:", offerDataToSave.client_id);
    console.log("type:", offerDataToSave.type);
    console.log("Toutes les données:", offerDataToSave);
    
    // Vérification finale avant insertion
    if (!offerDataToSave.company_id) {
      throw new Error("company_id manquant - impossible de créer l'offre");
    }
    if (!offerDataToSave.user_id) {
      throw new Error("user_id manquant - impossible de créer l'offre");
    }
    
    // Insertion de l'offre
    const { data, error } = await supabase
      .from('offers')
      .insert([offerDataToSave])
      .select()
      .single();
    
    if (error) {
      console.error("=== ERREUR LORS DE L'INSERTION ===");
      console.error("Message d'erreur:", error.message);
      console.error("Code d'erreur:", error.code);
      console.error("Détails:", error.details);
      console.error("Hint:", error.hint);
      console.error("Données tentées:", offerDataToSave);
      return { data: null, error };
    }
    
    console.log("Offre créée avec succès:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error };
  }
};
