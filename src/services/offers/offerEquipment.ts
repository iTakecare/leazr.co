
import { supabase } from "@/integrations/supabase/client";
import { 
  OfferEquipment, 
  OfferEquipmentAttribute, 
  OfferEquipmentSpecification 
} from "@/types/offerEquipment";

/**
 * Récupère tous les équipements d'une offre avec leurs attributs et spécifications
 */
export const getOfferEquipment = async (offerId: string): Promise<OfferEquipment[]> => {
  try {
    console.log("Fetching offer equipment for offer:", offerId);
    
    // Récupérer les équipements
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId);
    
    if (equipmentError) {
      console.error("Erreur lors de la récupération des équipements:", equipmentError);
      return [];
    }
    
    if (!equipmentData || equipmentData.length === 0) {
      console.log("No equipment found for offer:", offerId);
      return [];
    }
    
    console.log("Equipment found:", equipmentData.length, "items");
    
    const equipmentWithDetails: OfferEquipment[] = [];
    
    // Pour chaque équipement, récupérer ses attributs et spécifications
    for (const equipment of equipmentData) {
      // Récupérer les attributs
      const { data: attributesData, error: attributesError } = await supabase
        .from('offer_equipment_attributes')
        .select('*')
        .eq('equipment_id', equipment.id);
      
      if (attributesError) {
        console.error("Erreur lors de la récupération des attributs:", attributesError);
      }
      
      // Récupérer les spécifications
      const { data: specificationsData, error: specificationsError } = await supabase
        .from('offer_equipment_specifications')
        .select('*')
        .eq('equipment_id', equipment.id);
      
      if (specificationsError) {
        console.error("Erreur lors de la récupération des spécifications:", specificationsError);
      }
      
      equipmentWithDetails.push({
        ...equipment,
        attributes: attributesData || [],
        specifications: specificationsData || []
      });
    }
    
    console.log("Offer equipment fetched successfully with details");
    return equipmentWithDetails;
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error);
    return [];
  }
};

/**
 * Enregistre un équipement et ses attributs/spécifications
 */
export const saveEquipment = async (
  equipment: Omit<OfferEquipment, 'id' | 'created_at' | 'updated_at'>,
  attributes: Record<string, string> = {},
  specifications: Record<string, string | number> = {}
): Promise<OfferEquipment | null> => {
  try {
    console.log("Saving equipment for offer:", equipment.offer_id);
    
    // Vérifier d'abord que l'offre existe et que l'utilisateur a les droits
    const { data: offerCheck, error: offerError } = await supabase
      .from('offers')
      .select('id, user_id, ambassador_id')
      .eq('id', equipment.offer_id)
      .single();
    
    if (offerError || !offerCheck) {
      console.error("Erreur lors de la vérification de l'offre:", offerError);
      return null;
    }
    
    console.log("Offer verified, proceeding with equipment creation");
    
    // 1. Insérer l'équipement principal
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('offer_equipment')
      .insert({
        offer_id: equipment.offer_id,
        title: equipment.title,
        purchase_price: equipment.purchase_price,
        quantity: equipment.quantity,
        margin: equipment.margin,
        monthly_payment: equipment.monthly_payment,
        serial_number: equipment.serial_number
      })
      .select()
      .single();
    
    if (equipmentError) {
      console.error("Erreur lors de la sauvegarde de l'équipement:", equipmentError);
      return null;
    }
    
    const equipmentId = equipmentData.id;
    console.log("Equipment created with ID:", equipmentId);
    
    // 2. Insérer les attributs
    const attributeEntries = Object.entries(attributes);
    if (attributeEntries.length > 0) {
      const attributesToInsert = attributeEntries.map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value: String(value)
      }));
      
      const { error: attributesError } = await supabase
        .from('offer_equipment_attributes')
        .insert(attributesToInsert);
      
      if (attributesError) {
        console.error("Erreur lors de la sauvegarde des attributs:", attributesError);
      }
    }
    
    // 3. Insérer les spécifications
    const specificationEntries = Object.entries(specifications);
    if (specificationEntries.length > 0) {
      const specificationsToInsert = specificationEntries.map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value: String(value)
      }));
      
      const { error: specificationsError } = await supabase
        .from('offer_equipment_specifications')
        .insert(specificationsToInsert);
      
      if (specificationsError) {
        console.error("Erreur lors de la sauvegarde des spécifications:", specificationsError);
      }
    }
    
    // Retourner l'équipement avec ses attributs et spécifications
    return {
      ...equipmentData,
      attributes: attributeEntries.map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value: String(value)
      })),
      specifications: specificationEntries.map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value: String(value)
      }))
    };
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'équipement:", error);
    return null;
  }
};

/**
 * Migre les équipements existants du format JSON vers la nouvelle structure de tables
 * ATTENTION: Cette fonction ne supprime plus les anciens équipements pour éviter les erreurs RLS
 */
export const migrateEquipmentFromJson = async (offerId: string, equipmentJson: string | any): Promise<boolean> => {
  try {
    console.log("Starting equipment migration for offer:", offerId);
    
    // Convertir equipmentJson en objet s'il est déjà une chaîne
    let equipmentData;
    
    if (typeof equipmentJson === 'string') {
      try {
        equipmentData = JSON.parse(equipmentJson);
      } catch (error) {
        console.error("Erreur lors du parsing du JSON d'équipement:", error);
        return false;
      }
    } else {
      equipmentData = equipmentJson;
    }
    
    if (!Array.isArray(equipmentData)) {
      console.error("Le format JSON n'est pas un tableau d'équipements");
      return false;
    }
    
    console.log("Données d'équipement à migrer:", equipmentData);
    
    // Vérifier d'abord que l'offre existe
    const { data: offerExists, error: offerError } = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .single();
    
    if (offerError || !offerExists) {
      console.error("L'offre n'existe pas encore, migration reportée");
      return false;
    }
    
    // Vérifier s'il y a déjà des équipements pour cette offre
    const { data: existingEquipment, error: checkError } = await supabase
      .from('offer_equipment')
      .select('id')
      .eq('offer_id', offerId)
      .limit(1);
    
    if (checkError) {
      console.error("Erreur lors de la vérification des équipements existants:", checkError);
    }
    
    // Si des équipements existent déjà, ne pas les recréer
    if (existingEquipment && existingEquipment.length > 0) {
      console.log("Des équipements existent déjà pour cette offre, migration ignorée");
      return true;
    }
    
    // Migrer chaque équipement
    for (const item of equipmentData) {
      // Créer l'équipement de base
      const newEquipment = {
        offer_id: offerId,
        title: item.title || "Produit sans nom",
        purchase_price: Number(item.purchasePrice || item.purchase_price) || 0,
        quantity: Number(item.quantity) || 1,
        margin: Number(item.margin) || 0,
        monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
        serial_number: item.serialNumber || item.serial_number
      };
      
      // Extraire les attributs et spécifications
      const attributes = {};
      const specifications = {};
      
      // Traiter les attributs s'ils existent
      if (item.attributes && typeof item.attributes === 'object') {
        Object.entries(item.attributes).forEach(([key, value]) => {
          attributes[key] = String(value);
        });
      }
      
      // Traiter les spécifications s'ils existent
      if (item.specifications && typeof item.specifications === 'object') {
        Object.entries(item.specifications).forEach(([key, value]) => {
          specifications[key] = String(value);
        });
      }
      
      // Compatibilité avec l'ancien format qui utilisait "variants" au lieu de "specifications"
      if (item.variants && typeof item.variants === 'object') {
        Object.entries(item.variants).forEach(([key, value]) => {
          specifications[key] = String(value);
        });
      }
      
      // Sauvegarder l'équipement avec ses attributs et spécifications
      const result = await saveEquipment(newEquipment, attributes, specifications);
      if (!result) {
        console.error("Échec de la sauvegarde d'un équipement:", newEquipment);
      }
    }
    
    console.log(`Migration terminée avec succès pour l'offre ${offerId}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la migration des équipements:", error);
    return false;
  }
};

/**
 * Convertit les équipements en JSON pour la compatibilité avec le code existant
 */
export const convertEquipmentToJson = (equipment: OfferEquipment[]): string => {
  try {
    const jsonData = equipment.map(item => {
      // Convertir les attributs en objet
      const attributes: Record<string, string> = {};
      if (item.attributes && item.attributes.length > 0) {
        item.attributes.forEach(attr => {
          attributes[attr.key] = attr.value;
        });
      }
      
      // Convertir les spécifications en objet
      const specifications: Record<string, string> = {};
      if (item.specifications && item.specifications.length > 0) {
        item.specifications.forEach(spec => {
          specifications[spec.key] = spec.value;
        });
      }
      
      return {
        id: item.id,
        title: item.title,
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
        margin: item.margin,
        monthlyPayment: item.monthly_payment,
        serialNumber: item.serial_number,
        attributes,
        specifications
      };
    });
    
    return JSON.stringify(jsonData);
  } catch (error) {
    console.error("Erreur lors de la conversion des équipements en JSON:", error);
    return "[]";
  }
};

/**
 * Force la migration de tous les équipements pour une offre spécifique
 */
export const forceMigrateEquipmentData = async (offerId: string): Promise<boolean> => {
  try {
    // 1. Récupérer l'offre existante
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('equipment_description')
      .eq('id', offerId)
      .single();
    
    if (offerError || !offer) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      return false;
    }
    
    if (!offer.equipment_description) {
      console.log("Aucune description d'équipement à migrer pour cette offre");
      return false;
    }
    
    // 2. Forcer la migration des équipements
    const success = await migrateEquipmentFromJson(offerId, offer.equipment_description);
    return success;
  } catch (error) {
    console.error("Erreur lors de la migration forcée:", error);
    return false;
  }
};
