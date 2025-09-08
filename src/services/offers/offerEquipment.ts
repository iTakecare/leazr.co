import { supabase } from "@/integrations/supabase/client";
import { 
  OfferEquipment, 
  OfferEquipmentAttribute, 
  OfferEquipmentSpecification 
} from "@/types/offerEquipment";

/**
 * Parse JSON equipment data and convert to OfferEquipment format
 */
const parseEquipmentFromJson = (equipmentJson: string): OfferEquipment[] => {
  try {
    const data = JSON.parse(equipmentJson);
    if (!Array.isArray(data)) return [];
    
    return data.map((item, index) => ({
      id: `temp-${index}`,
      offer_id: 'temp',
      title: item.title || "Produit sans nom",
      purchase_price: Number(item.purchasePrice || item.purchase_price) || 0,
      quantity: Number(item.quantity) || 1,
      margin: Number(item.margin) || 0,
      monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
      serial_number: item.serialNumber || item.serial_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: item.attributes ? Object.entries(item.attributes).map(([key, value]) => ({
        equipment_id: `temp-${index}`,
        key,
        value: String(value)
      })) : [],
      specifications: item.specifications ? Object.entries(item.specifications).map(([key, value]) => ({
        equipment_id: `temp-${index}`,
        key,
        value: String(value)
      })) : []
    }));
  } catch (error) {
    console.error("Error parsing equipment JSON:", error);
    return [];
  }
};

/**
 * Fetch equipment with their attributes and specifications
 */
const fetchEquipmentWithDetails = async (equipmentData: any[]): Promise<OfferEquipment[]> => {
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
};

/**
 * Récupère tous les équipements d'une offre avec leurs attributs et spécifications
 * Avec migration automatique depuis JSON si les nouvelles tables sont vides
 */
export const getOfferEquipment = async (offerId: string): Promise<OfferEquipment[]> => {
  console.log("🔥 EQUIPMENT SERVICE - Starting getOfferEquipment for:", offerId);
  
  try {
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("🔥 EQUIPMENT SERVICE - Current user:", user?.id, "Email:", user?.email);
    
    if (authError) {
      console.error("🔥 EQUIPMENT SERVICE - Auth error:", authError);
      throw new Error("Erreur d'authentification: " + authError.message);
    }

    // D'abord essayer de récupérer depuis la nouvelle table offer_equipment
    console.log("🔥 EQUIPMENT SERVICE - Querying offer_equipment table...");
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select(`
        *,
        attributes:offer_equipment_attributes(key, value),
        specifications:offer_equipment_specifications(key, value)
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      console.error("🔥 EQUIPMENT SERVICE - Equipment query error:", equipmentError);
      throw new Error("Erreur lors de la récupération des équipements: " + equipmentError.message);
    }

    console.log("🔥 EQUIPMENT SERVICE - Equipment query result:", equipmentData?.length, "items");

    // Si nous avons des données dans offer_equipment, les utiliser
    if (equipmentData && equipmentData.length > 0) {
      console.log("🔥 EQUIPMENT SERVICE - Processing equipment details...");
      const processed = await fetchEquipmentWithDetails(equipmentData);
      console.log("🔥 EQUIPMENT SERVICE - Processed equipment:", processed.length, "items");
      return processed;
    }

    console.log("🔥 EQUIPMENT SERVICE - No equipment in offer_equipment, checking offer JSON...");
    
    // Sinon, essayer de migrer depuis le champ JSON de la table offers
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('equipment_description')
      .eq('id', offerId)
      .single();

    if (offerError) {
      console.error("🔥 EQUIPMENT SERVICE - Offer query error:", offerError);
      throw new Error("Erreur lors de la récupération de l'offre: " + offerError.message);
    }

    console.log("🔥 EQUIPMENT SERVICE - Offer equipment_description:", !!offerData?.equipment_description);

    if (offerData?.equipment_description) {
      console.log("🔥 EQUIPMENT SERVICE - Attempting migration from JSON...");
      
      try {
        // Essayer de migrer les données JSON vers la nouvelle structure
        const migrationSuccess = await migrateEquipmentFromJson(offerId, offerData.equipment_description);
        
        if (migrationSuccess) {
          console.log("🔥 EQUIPMENT SERVICE - Migration successful, fetching migrated data...");
          // Récupérer les équipements migrés
          const { data: migratedData, error: migratedError } = await supabase
            .from('offer_equipment')
            .select(`
              *,
              attributes:offer_equipment_attributes(key, value),
              specifications:offer_equipment_specifications(key, value)
            `)
            .eq('offer_id', offerId)
            .order('created_at', { ascending: true });

          if (migratedError) {
            console.error("🔥 EQUIPMENT SERVICE - Migration query error:", migratedError);
            throw new Error("Erreur lors de la récupération des équipements migrés: " + migratedError.message);
          }

          const processed = await fetchEquipmentWithDetails(migratedData || []);
          console.log("🔥 EQUIPMENT SERVICE - Final migrated equipment:", processed.length, "items");
          return processed;
        } else {
          console.warn("🔥 EQUIPMENT SERVICE - Migration failed");
        }
      } catch (migrationError) {
        console.error("🔥 EQUIPMENT SERVICE - Migration error:", migrationError);
        // En cas d'erreur de migration, retourner un tableau vide plutôt que de lancer une erreur
      }
    }

    console.log("🔥 EQUIPMENT SERVICE - No equipment found for offer:", offerId);
    return [];

  } catch (error) {
    console.error("🔥 EQUIPMENT SERVICE - Global error:", error);
    throw error;
  }
};

/**
 * Enregistre un équipment et ses attributs/spécifications en utilisant les fonctions SECURITY DEFINER
 */
export const saveEquipment = async (
  equipment: Omit<OfferEquipment, 'id' | 'created_at' | 'updated_at'>,
  attributes: Record<string, string> = {},
  specifications: Record<string, string | number> = {}
): Promise<OfferEquipment | null> => {
  try {
    console.log("Saving equipment for offer:", equipment.offer_id);
    console.log("Equipment attributes to save:", attributes);
    console.log("Equipment specifications to save:", specifications);
    
    // 1. Insérer l'équipement principal en utilisant la fonction SECURITY DEFINER
    const { data: equipmentId, error: equipmentError } = await supabase
      .rpc('insert_offer_equipment_secure', {
        p_offer_id: equipment.offer_id,
        p_title: equipment.title,
        p_purchase_price: equipment.purchase_price,
        p_quantity: equipment.quantity,
        p_margin: equipment.margin,
        p_monthly_payment: equipment.monthly_payment,
        p_serial_number: equipment.serial_number
      });
    
    if (equipmentError) {
      console.error("Erreur lors de la sauvegarde de l'équipement:", equipmentError);
      return null;
    }
    
    console.log("Equipment created with ID:", equipmentId);
    
    // 2. Insérer les attributs en utilisant la fonction SECURITY DEFINER
    if (Object.keys(attributes).length > 0) {
      console.log("Inserting attributes:", attributes);
      const { error: attributesError } = await supabase
        .rpc('insert_offer_equipment_attributes_secure', {
          p_equipment_id: equipmentId,
          p_attributes: attributes
        });
      
      if (attributesError) {
        console.error("Erreur lors de la sauvegarde des attributs:", attributesError);
      } else {
        console.log("Attributes saved successfully");
      }
    }
    
    // 3. Insérer les spécifications en utilisant la fonction SECURITY DEFINER
    if (Object.keys(specifications).length > 0) {
      // Convertir les valeurs en string pour la fonction
      const specStrings = Object.fromEntries(
        Object.entries(specifications).map(([key, value]) => [key, String(value)])
      );
      
      console.log("Inserting specifications:", specStrings);
      const { error: specificationsError } = await supabase
        .rpc('insert_offer_equipment_specifications_secure', {
          p_equipment_id: equipmentId,
          p_specifications: specStrings
        });
      
      if (specificationsError) {
        console.error("Erreur lors de la sauvegarde des spécifications:", specificationsError);
      } else {
        console.log("Specifications saved successfully");
      }
    }
    
    // Retourner l'équipement avec ses attributs et spécifications
    return {
      id: equipmentId,
      offer_id: equipment.offer_id,
      title: equipment.title,
      purchase_price: equipment.purchase_price,
      quantity: equipment.quantity,
      margin: equipment.margin,
      monthly_payment: equipment.monthly_payment,
      serial_number: equipment.serial_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: Object.entries(attributes).map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value
      })),
      specifications: Object.entries(specifications).map(([key, value]) => ({
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
 * Utilise maintenant les fonctions SECURITY DEFINER
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
        // Ne pas faire échouer toute la migration pour un seul équipement
        continue;
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

/**
 * Met à jour un équipement existant
 */
export const updateOfferEquipment = async (
  equipmentId: string,
  updates: Partial<Pick<OfferEquipment, 'title' | 'purchase_price' | 'quantity' | 'margin' | 'monthly_payment' | 'selling_price' | 'coefficient' | 'serial_number'>>
): Promise<boolean> => {
  try {
    console.log("Updating equipment:", equipmentId, "with:", updates);
    
    const { data, error } = await supabase
      .rpc('update_offer_equipment_secure', {
        p_equipment_id: equipmentId,
        p_title: updates.title || null,
        p_purchase_price: updates.purchase_price || null,
        p_quantity: updates.quantity || null,
        p_margin: updates.margin || null,
        p_monthly_payment: updates.monthly_payment || null,
        p_selling_price: updates.selling_price || null,
        p_coefficient: updates.coefficient || null,
        p_serial_number: updates.serial_number || null
      });
    
    if (error) {
      console.error("Erreur lors de la mise à jour de l'équipement:", error);
      throw new Error(error.message);
    }
    
    console.log("Equipment updated successfully");
    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'équipement:", error);
    throw error;
  }
};

/**
 * Supprime un équipement existant et toutes ses données liées
 */
export const deleteOfferEquipment = async (equipmentId: string): Promise<boolean> => {
  try {
    console.log("Deleting equipment:", equipmentId);
    
    // Supprimer d'abord les attributs
    const { error: attributesError } = await supabase
      .from('offer_equipment_attributes')
      .delete()
      .eq('equipment_id', equipmentId);
    
    if (attributesError) {
      console.error("Erreur lors de la suppression des attributs:", attributesError);
    }
    
    // Supprimer les spécifications
    const { error: specificationsError } = await supabase
      .from('offer_equipment_specifications')
      .delete()
      .eq('equipment_id', equipmentId);
    
    if (specificationsError) {
      console.error("Erreur lors de la suppression des spécifications:", specificationsError);
    }
    
    // Supprimer l'équipement principal
    const { error: equipmentError } = await supabase
      .from('offer_equipment')
      .delete()
      .eq('id', equipmentId);
    
    if (equipmentError) {
      console.error("Erreur lors de la suppression de l'équipement:", equipmentError);
      throw new Error(equipmentError.message);
    }
    
    console.log("Equipment deleted successfully");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipement:", error);
    throw error;
  }
};
