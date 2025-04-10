
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
      return [];
    }
    
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
 */
export const migrateEquipmentFromJson = async (offerId: string, equipmentJson: string): Promise<boolean> => {
  try {
    let equipmentData;
    
    try {
      equipmentData = JSON.parse(equipmentJson);
    } catch (error) {
      console.error("Erreur lors du parsing du JSON d'équipement:", error);
      return false;
    }
    
    if (!Array.isArray(equipmentData)) {
      console.error("Le format JSON n'est pas un tableau d'équipements");
      return false;
    }
    
    // Supprimer les anciens équipements s'ils existent
    await supabase
      .from('offer_equipment')
      .delete()
      .eq('offer_id', offerId);
    
    // Migrer chaque équipement
    for (const item of equipmentData) {
      const newEquipment = {
        offer_id: offerId,
        title: item.title || "Produit sans nom",
        purchase_price: Number(item.purchasePrice) || 0,
        quantity: Number(item.quantity) || 1,
        margin: Number(item.margin) || 0,
        monthly_payment: Number(item.monthlyPayment) || 0,
        serial_number: item.serialNumber
      };
      
      const attributes = item.attributes || {};
      const specifications = item.specifications || {};
      
      await saveEquipment(
        newEquipment,
        attributes,
        specifications
      );
    }
    
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
