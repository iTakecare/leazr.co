import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("🚀 CRÉATION OFFRE - Début du processus");
    console.log("📋 DONNÉES REÇUES:", offerData);
    
    // Récupérer le company_id de l'utilisateur connecté
    let companyId;
    try {
      companyId = await getCurrentUserCompanyId();
      console.log("🏢 Company ID récupéré:", companyId);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du company_id:", error);
      throw new Error("Impossible de récupérer l'ID de l'entreprise");
    }

    if (!companyId) {
      throw new Error("Company ID is required but not found");
    }
    
    // S'assurer que les valeurs numériques sont correctement converties
    const offerDataToSave = {
      ...offerData,
      company_id: companyId, // Ajouter explicitement le company_id
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission !== undefined && offerData.commission !== null ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined,
      // Convertir la marge si elle est présente
      margin: offerData.margin !== undefined && offerData.margin !== null ?
        (typeof offerData.margin === 'string' ? parseFloat(offerData.margin) : offerData.margin) :
        undefined
    };

    console.log("💾 DONNÉES FINALES à sauvegarder:", {
      user_id: offerDataToSave.user_id,
      company_id: offerDataToSave.company_id,
      client_name: offerDataToSave.client_name,
      type: offerDataToSave.type,
      amount: offerDataToSave.amount,
      monthly_payment: offerDataToSave.monthly_payment
    });

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
      console.warn("Commission invalide détectée (NaN) dans createOffer.ts, définition à 0");
      offerDataToSave.commission = 0;
    }

    // Si la commission est déjà définie et non nulle, nous utilisons cette valeur
    // Cela est prioritaire par rapport au calcul basé sur l'ambassadeur
    if (offerDataToSave.commission !== undefined && offerDataToSave.commission !== null) {
      console.log(`Utilisation de la commission fournie explicitement dans les données: ${offerDataToSave.commission}`);
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
            // Ensure amount is a number for calculation
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
      // Structure correcte pour le stockage des équipements dans le champ equipment_description
      // Si les équipements sont fournis sous forme d'un tableau JSON, les stocker ainsi
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
    
    // Log des données finales
    console.log("Données finales de l'offre avant sauvegarde:", {
      amount: offerDataToSave.amount,
      coefficient: offerDataToSave.coefficient,
      monthly_payment: offerDataToSave.monthly_payment,
      financed_amount: offerDataToSave.financed_amount,
      commission: offerDataToSave.commission,
      margin: offerDataToSave.margin,
      type: offerDataToSave.type,
      company_id: offerDataToSave.company_id
    });
    
    // Insertion de l'offre
    console.log("💾 INSERTION - Tentative d'insertion en base de données...");
    const { data, error } = await supabase
      .from('offers')
      .insert([offerDataToSave])
      .select()
      .single();
    
    if (error) {
      console.error("❌ ERREUR lors de l'insertion de l'offre:", error);
      console.error("❌ Détails de l'erreur:", error.details);
      console.error("❌ Message d'erreur:", error.message);
      return { data: null, error };
    }
    
    console.log("✅ OFFRE CRÉÉE AVEC SUCCÈS !");
    console.log("📋 Données de l'offre créée:", data);
    console.log("🆔 ID de la nouvelle offre:", data.id);
    
    return { data, error: null };
  } catch (error) {
    console.error("❌ ERREUR GÉNÉRALE dans createOffer:", error);
    return { data: null, error };
  }
};
