
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import { logOfferCreation } from "./offerHistory";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("🚀 CRÉATION OFFRE - Début du processus");
    console.log("📋 DONNÉES REÇUES:", offerData);
    
    // Vérifier que les données obligatoires sont présentes
    if (!offerData.client_name) {
      throw new Error("Le nom du client est obligatoire");
    }
    
    // Si mode "produits à déterminer", ignorer la validation des équipements
    if (offerData.products_to_be_determined) {
      console.log("✅ MODE PRODUITS À DÉTERMINER - Validation d'équipements ignorée");
      if (!offerData.estimated_budget || offerData.estimated_budget <= 0) {
        throw new Error("Le budget estimé est obligatoire en mode 'produits à déterminer'");
      }
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
    if (offerData.equipment && Array.isArray(offerData.equipment) && !offerData.products_to_be_determined) {
      totalEquipmentMargin = offerData.equipment.reduce((sum, eq) => {
        const equipmentMargin = (eq.purchasePrice * eq.quantity * eq.margin) / 100;
        return sum + equipmentMargin;
      }, 0);
      console.log("💰 MARGE CALCULÉE depuis les équipements:", totalEquipmentMargin);
    }
    
    // CORRECTION: Déterminer le type d'offre correctement
    let offerType = offerData.type || 'admin_offer';
    
    // Si un ambassador_id est présent, c'est une offre ambassadeur
    if (offerData.ambassador_id) {
      offerType = 'ambassador_offer';
      console.log("👨‍💼 OFFRE AMBASSADEUR détectée - Type mis à jour:", offerType);
    }
    // Si le type est explicitement défini comme client_request, le préserver
    else if (offerData.type === 'client_request') {
      offerType = 'client_request';
      console.log("📋 DEMANDE CLIENT détectée:", offerType);
    }
    // Si le type est explicitement défini comme interne (rétrocompatibilité)
    else if (offerData.type === 'internal_offer') {
      offerType = 'internal_offer';
      console.log("🏠 OFFRE INTERNE (legacy) détectée:", offerType);
    }
    // Sinon, c'est une offre administrative par défaut
    else {
      offerType = 'admin_offer';
      console.log("⚙️ OFFRE ADMINISTRATIVE par défaut:", offerType);
    }
    
    // Déterminer si c'est un achat direct
    const isPurchase = offerData.is_purchase || false;
    
    // Préparer les données pour la base de données (SANS le champ equipment)
    const dbOfferData = {
      user_id: offerData.user_id,
      company_id: companyId,
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      // COEFFICIENT - Sera traité après la création de l'objet
      coefficient: offerData.coefficient,
      monthly_payment: isPurchase ? 0 : (typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment),
      leaser_id: isPurchase ? null : offerData.leaser_id,
      duration: isPurchase ? null : offerData.duration,
      is_purchase: isPurchase,
      commission: offerData.commission !== undefined && offerData.commission !== null ?
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined,
      financed_amount: offerData.financed_amount,
      status: offerData.status || 'pending',
      // S'assurer que workflow_status est toujours défini
      workflow_status: offerData.workflow_status || 'draft',
      type: offerType, // Utiliser le type corrigé
      remarks: offerData.remarks,
      ambassador_id: offerData.ambassador_id,
      signature_data: offerData.signature_data,
      signer_name: offerData.signer_name,
      signed_at: offerData.signed_at,
      signer_ip: offerData.signer_ip,
      commission_status: offerData.commission_status,
      commission_paid_at: offerData.commission_paid_at,
      converted_to_contract: offerData.converted_to_contract,
      dossier_number: offerData.dossier_number, // Ajouter le numéro de dossier
      source: offerData.source, // Ajouter la source
      products_to_be_determined: offerData.products_to_be_determined || false,
      estimated_budget: offerData.estimated_budget,
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
        parseFloat(offerData.total_margin_with_difference) : (offerData.total_margin_with_difference || totalEquipmentMargin),
      // Ajouter les frais de dossier et l'assurance annuelle
      file_fee: typeof offerData.file_fee === 'number' ? offerData.file_fee : 0,
      annual_insurance: typeof offerData.annual_insurance === 'number' ? offerData.annual_insurance : 0
    };

    // ==================== SÉCURITÉ COEFFICIENT - TRAITEMENT POST-CRÉATION ====================
    console.log("🔢 COEFFICIENT AVANT TRAITEMENT:", {
      value: dbOfferData.coefficient,
      type: typeof dbOfferData.coefficient,
      isPurchase,
      isNull: dbOfferData.coefficient === null,
      isUndefined: dbOfferData.coefficient === undefined
    });

    // Forcer le coefficient à une valeur valide en fonction du mode
    if (isPurchase) {
      dbOfferData.coefficient = 0;
      console.log("🔢 MODE ACHAT - Coefficient forcé à 0");
    } else {
      const rawCoef = Number(offerData.coefficient);
      if (isNaN(rawCoef) || offerData.coefficient === null || offerData.coefficient === undefined) {
        dbOfferData.coefficient = 3.55; // Fallback par défaut pour le leasing
        console.log("🔢 MODE LEASING - Coefficient fallback appliqué: 3.55");
      } else {
        dbOfferData.coefficient = rawCoef;
        console.log("🔢 MODE LEASING - Coefficient utilisé:", rawCoef);
      }
    }

    console.log("🔢 COEFFICIENT APRÈS TRAITEMENT:", dbOfferData.coefficient, "Type:", typeof dbOfferData.coefficient);

    console.log("💾 DONNÉES FINALES à sauvegarder:", {
      user_id: dbOfferData.user_id,
      company_id: dbOfferData.company_id,
      client_name: dbOfferData.client_name,
      type: dbOfferData.type,
      workflow_status: dbOfferData.workflow_status,
      amount: dbOfferData.amount,
      monthly_payment: dbOfferData.monthly_payment,
      margin: dbOfferData.margin,
      ambassador_id: dbOfferData.ambassador_id,
      dossier_number: dbOfferData.dossier_number,
      leaser_id: dbOfferData.leaser_id,
      duration: dbOfferData.duration,
      has_id_field: 'id' in dbOfferData // Vérifier si id est présent
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
    else if (offerType === 'ambassador_offer' && offerData.user_id) {
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
      company_id: dbOfferData.company_id,
      ambassador_id: dbOfferData.ambassador_id
    });
    
    // ==================== TRIPLE SÉCURITÉ AVANT INSERT ====================
    // Vérification 1: Détection de null/undefined
    if (dbOfferData.coefficient === null || dbOfferData.coefficient === undefined) {
      console.error("❌ ALERTE CRITIQUE: Coefficient null/undefined détecté avant insert!");
      console.error("❌ Données:", { coefficient: dbOfferData.coefficient, is_purchase: dbOfferData.is_purchase });
      dbOfferData.coefficient = dbOfferData.is_purchase ? 0 : 3.55;
      console.warn("⚠️ Coefficient corrigé à:", dbOfferData.coefficient);
    }

    // Vérification 2: S'assurer que c'est un nombre
    dbOfferData.coefficient = Number(dbOfferData.coefficient);
    
    // Vérification 3: Vérifier NaN après conversion
    if (isNaN(dbOfferData.coefficient)) {
      console.error("❌ ALERTE: Coefficient NaN après conversion Number()!");
      dbOfferData.coefficient = dbOfferData.is_purchase ? 0 : 3.55;
      console.warn("⚠️ Coefficient corrigé à:", dbOfferData.coefficient);
    }
    
    // Log final obligatoire
    console.log("💾 INSERTION - Tentative d'insertion en base de données...");
    console.log("💾 COEFFICIENT FINAL AVANT INSERT:", {
      value: dbOfferData.coefficient,
      type: typeof dbOfferData.coefficient,
      isNumber: typeof dbOfferData.coefficient === 'number',
      isNaN: isNaN(dbOfferData.coefficient)
    });
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
    console.log("🏷️ Type d'offre finale:", data.type);
    
    // NOUVEAU : Enregistrer l'événement de création dans l'historique
    if (data.id && offerData.user_id) {
      try {
        await logOfferCreation(data.id, offerData.user_id, {
          client_name: offerData.client_name,
          client_email: offerData.client_email,
          amount: offerData.amount,
          monthly_payment: offerData.monthly_payment,
          type: offerData.type,
          equipment_count: Array.isArray(offerData.equipment) ? offerData.equipment.length : 0
        });
        console.log("✅ Événement de création ajouté à l'historique");
      } catch (historyError) {
        console.error("❌ Erreur lors de l'ajout à l'historique:", historyError);
        // Ne pas faire échouer la création pour un problème d'historique
      }
    }
    
    // Maintenant sauvegarder les équipements avec leurs attributs et spécifications
    // SAUF si mode "produits à déterminer"
    if (offerData.equipment && Array.isArray(offerData.equipment) && data.id && !offerData.products_to_be_determined) {
      console.log("💾 SAUVEGARDE des équipements avec attributs et spécifications...");
      
      for (const equipment of offerData.equipment) {
        try {
          // Préparer les attributs et spécifications avec des valeurs par défaut
          const attributes = equipment.attributes || {};
          const specifications = equipment.specifications || {};
          
          // Créer l'équipement de base
          // En mode achat: monthly_payment = 0, selling_price est le prix de vente
          const purchasePrice = equipment.purchasePrice || equipment.purchase_price || 0;
          const marginPercent = equipment.margin || 0;
          const quantity = equipment.quantity || 1;
          
          // Calculer le prix de vente automatiquement si non fourni (en mode achat)
          let sellingPrice = equipment.sellingPrice || equipment.selling_price || null;
          if (isPurchase && !sellingPrice && purchasePrice > 0) {
            // selling_price = (prix_achat + marge%) * quantité
            sellingPrice = purchasePrice * (1 + marginPercent / 100) * quantity;
            console.log(`💰 Prix de vente calculé pour ${equipment.title}: ${sellingPrice}€`);
          }
          
          const newEquipment = {
            offer_id: data.id,
            title: equipment.title,
            purchase_price: purchasePrice,
            quantity: quantity,
            margin: marginPercent,
            // En mode achat : monthly_payment doit être 0
            monthly_payment: isPurchase ? 0 : (equipment.monthlyPayment || equipment.monthly_payment || 0),
            // En mode achat : selling_price est le prix de vente total
            selling_price: sellingPrice,
            serial_number: equipment.serialNumber || equipment.serial_number,
            product_id: equipment.productId || equipment.product_id || null,
            image_url: equipment.imageUrl || equipment.image_url || 
                      (equipment.image_urls && equipment.image_urls[0]) || null
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
