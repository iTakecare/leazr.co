import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("🚀 CRÉATION OFFRE - Début du processus");
    console.log("📋 DONNÉES REÇUES:", offerData);
    
    // Vérifier que les données obligatoires sont présentes
    if (!offerData.client_name || !offerData.client_email) {
      throw new Error("Les informations client (nom et email) sont obligatoires");
    }
    
    // Récupérer le company_id de l'utilisateur connecté si pas fourni
    let companyId = offerData.company_id;
    if (!companyId) {
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
    }
    
    // Calculer la marge totale des équipements si présents
    let totalEquipmentMargin = 0;
    if (offerData.equipment && Array.isArray(offerData.equipment)) {
      totalEquipmentMargin = offerData.equipment.reduce((sum, eq) => {
        const equipmentMargin = (eq.purchasePrice * eq.quantity * eq.margin) / 100;
        return sum + equipmentMargin;
      }, 0);
      console.log("💰 MARGE CALCULÉE depuis les équipements:", totalEquipmentMargin);
    }
    
    // Préparer les données pour la base de données (SANS le champ equipment)
    const dbOfferData = {
      user_id: offerData.user_id,
      company_id: companyId,
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission !== undefined && offerData.commission !== null ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined,
      financed_amount: offerData.financed_amount,
      status: offerData.status || 'pending',
      // S'assurer que workflow_status est toujours défini
      workflow_status: offerData.workflow_status || 'draft',
      type: offerData.type || 'admin_offer',
      remarks: offerData.remarks,
      ambassador_id: offerData.ambassador_id,
      signature_data: offerData.signature_data,
      signer_name: offerData.signer_name,
      signed_at: offerData.signed_at,
      signer_ip: offerData.signer_ip,
      commission_status: offerData.commission_status,
      commission_paid_at: offerData.commission_paid_at,
      converted_to_contract: offerData.converted_to_contract,
      // Utiliser la marge calculée depuis les équipements si disponible, sinon utiliser celle fournie
      margin: totalEquipmentMargin > 0 ? totalEquipmentMargin : (
        offerData.margin !== undefined && offerData.margin !== null ?
        (typeof offerData.margin === 'string' ? parseFloat(offerData.margin) : offerData.margin) :
        undefined
      ),
      // Calculer les champs de marge
      margin_difference: typeof offerData.margin_difference === 'string' ? 
        parseFloat(offerData.margin_difference) : (offerData.margin_difference || 0),
      total_margin_with_difference: typeof offerData.total_margin_with_difference === 'string' ? 
        parseFloat(offerData.total_margin_with_difference) : (offerData.total_margin_with_difference || totalEquipmentMargin)
    };

    console.log("💾 DONNÉES FINALES à sauvegarder:", {
      user_id: dbOfferData.user_id,
      company_id: dbOfferData.company_id,
      client_name: dbOfferData.client_name,
      type: dbOfferData.type,
      workflow_status: dbOfferData.workflow_status,
      amount: dbOfferData.amount,
      monthly_payment: dbOfferData.monthly_payment,
      margin: dbOfferData.margin
    });

    // Calculer le montant financé si non défini
    if (!dbOfferData.financed_amount && dbOfferData.monthly_payment && dbOfferData.coefficient) {
      dbOfferData.financed_amount = parseFloat(
        (Number(dbOfferData.monthly_payment) * Number(dbOfferData.coefficient)).toFixed(2)
      );
      console.log("Montant financé calculé:", dbOfferData.financed_amount);
    }

    // Vérification pour commission invalide (NaN)
    if (dbOfferData.commission !== undefined && isNaN(Number(dbOfferData.commission))) {
      console.warn("Commission invalide détectée (NaN) dans createOffer.ts, définition à 0");
      dbOfferData.commission = 0;
    }

    // Si la commission est déjà définie et non nulle, nous utilisons cette valeur
    // Cela est prioritaire par rapport au calcul basé sur l'ambassadeur
    if (dbOfferData.commission !== undefined && dbOfferData.commission !== null) {
      console.log(`Utilisation de la commission fournie explicitement dans les données: ${dbOfferData.commission}`);
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
        dbOfferData.ambassador_id = ambassadorData.id;
        
        // Si nous avons un montant et un niveau de commission, recalculons la commission
        if (dbOfferData.amount && ambassadorData.commission_level_id) {
          try {
            // Ensure amount is a number for calculation
            const amount = typeof dbOfferData.amount === 'string' 
              ? parseFloat(dbOfferData.amount) 
              : dbOfferData.amount;
              
            const commissionData = await calculateCommissionByLevel(
              Number(amount),
              ambassadorData.commission_level_id,
              'ambassador',
              ambassadorData.id
            );
            
            if (commissionData && commissionData.amount) {
              dbOfferData.commission = commissionData.amount;
              console.log(`Commission calculée pour l'ambassadeur: ${commissionData.amount}`);
            }
          } catch (commError) {
            console.error("Error calculating commission during offer creation:", commError);
          }
        }
      }
    }
    
    // Log des données finales
    console.log("Données finales de l'offre avant sauvegarde:", {
      amount: dbOfferData.amount,
      coefficient: dbOfferData.coefficient,
      monthly_payment: dbOfferData.monthly_payment,
      financed_amount: dbOfferData.financed_amount,
      commission: dbOfferData.commission,
      margin: dbOfferData.margin,
      type: dbOfferData.type,
      company_id: dbOfferData.company_id
    });
    
    // Insertion de l'offre (SANS le champ equipment)
    console.log("💾 INSERTION - Tentative d'insertion en base de données...");
    const { data, error } = await supabase
      .from('offers')
      .insert([dbOfferData])
      .select()
      .single();
    
    if (error) {
      console.error("❌ ERREUR lors de l'insertion de l'offre:", error);
      console.error("❌ Détails de l'erreur:", error.details);
      console.error("❌ Message d'erreur:", error.message);
      console.error("❌ Code d'erreur:", error.code);
      console.error("❌ Données envoyées:", JSON.stringify(dbOfferData, null, 2));
      return { data: null, error };
    }
    
    console.log("✅ OFFRE CRÉÉE AVEC SUCCÈS !");
    console.log("📋 Données de l'offre créée:", data);
    console.log("🆔 ID de la nouvelle offre:", data.id);
    
    // Maintenant sauvegarder les équipements avec leurs attributs et spécifications
    if (offerData.equipment && Array.isArray(offerData.equipment) && data.id) {
      console.log("💾 SAUVEGARDE des équipements avec attributs et spécifications...");
      
      for (const equipment of offerData.equipment) {
        try {
          // Préparer les attributs et spécifications avec des valeurs par défaut
          const attributes = equipment.attributes || {};
          const specifications = equipment.specifications || {};
          
          // Créer l'équipement de base
          const newEquipment = {
            offer_id: data.id,
            title: equipment.title,
            purchase_price: equipment.purchasePrice || equipment.purchase_price || 0,
            quantity: equipment.quantity || 1,
            margin: equipment.margin || 0,
            monthly_payment: equipment.monthlyPayment || equipment.monthly_payment || 0,
            serial_number: equipment.serialNumber || equipment.serial_number
          };
          
          console.log("💾 Sauvegarde équipement:", newEquipment);
          console.log("💾 Avec attributs:", attributes);
          console.log("💾 Avec spécifications:", specifications);
          
          // Sauvegarder l'équipement avec ses attributs
          const { saveEquipment } = await import('./offerEquipment');
          const result = await saveEquipment(newEquipment, attributes, specifications);
          
          if (result) {
            console.log("✅ Équipement sauvegardé avec succès:", result.id);
          } else {
            console.error("❌ Échec de la sauvegarde de l'équipement:", newEquipment.title);
          }
        } catch (equipmentError) {
          console.error("❌ Erreur lors de la sauvegarde de l'équipement:", equipmentError);
        }
      }
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("❌ ERREUR GÉNÉRALE dans createOffer:", error);
    console.error("❌ Stack trace:", error.stack);
    return { data: null, error };
  }
};
