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
    console.log("Saving equipment with data:", {
      equipment,
      attributes,
      specifications
    });
    
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
      
      console.log("Inserting attributes:", attributesToInsert);
      
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
      
      console.log("Inserting specifications:", specificationsToInsert);
      
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
 * Analyse une chaîne JSON d'équipement pour extraire les spécifications
 */
const parseEquipmentSpecsFromText = (text: string): { specs: Record<string, string>; attributes: Record<string, string> } => {
  // Résultat par défaut
  const result = {
    specs: {},
    attributes: {}
  };
  
  // Patterns courants pour les spécifications
  const specPatterns = [
    // Format: "RAM: 8Go, Disque Dur: 256Go"
    /([^:,]+):\s*([^,]+)/g,
    
    // Format: "RAM 8Go - SSD 256Go - Écran 15""
    /([^\s-]+)\s+([^-]+)/g
  ];
  
  try {
    // Essai 1: Rechercher des patterns de spécifications dans le texte
    let matches;
    for (const pattern of specPatterns) {
      // Réinitialiser le regex pour chaque pattern
      pattern.lastIndex = 0;
      
      // Rechercher toutes les correspondances
      while ((matches = pattern.exec(text)) !== null) {
        const key = matches[1].trim();
        const value = matches[2].trim();
        
        // Déterminer si c'est une spécification ou un attribut
        if (key.toLowerCase().match(/ram|mémoire|disque|ssd|écran|screen|processor|processeur|gpu|cpu|bluetooth|wifi/i)) {
          result.specs[key] = value;
        } else {
          result.attributes[key] = value;
        }
      }
    }
    
    // Essai 2: Rechercher des spécifications classiques
    if (Object.keys(result.specs).length === 0) {
      // RAM
      const ramMatch = text.match(/(\d+)\s*(Go|GB|G)\s*(RAM|Mémoire)/i) || 
                       text.match(/(RAM|Mémoire)\s*:?\s*(\d+)\s*(Go|GB|G)/i);
      if (ramMatch) {
        result.specs["RAM"] = ramMatch[0];
      }
      
      // Stockage
      const storageMatch = text.match(/(\d+)\s*(Go|GB|G|To|TB|T)\s*(SSD|HDD|Disque)/i) || 
                           text.match(/(SSD|HDD|Disque)\s*:?\s*(\d+)\s*(Go|GB|G|To|TB|T)/i);
      if (storageMatch) {
        result.specs["Stockage"] = storageMatch[0];
      }
      
      // Écran
      const screenMatch = text.match(/(\d+[,.]\d+||\d+)\s*("|pouces|inch)/i) || 
                          text.match(/(Écran|Screen)\s*:?\s*(\d+[,.]\d+||\d+)\s*("|pouces|inch)/i);
      if (screenMatch) {
        result.specs["Écran"] = screenMatch[0];
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'analyse des spécifications:", error);
  }
  
  return result;
};

/**
 * Extrait les attributs et spécifications à partir de l'ancien format JSON
 */
const extractAttributesAndSpecs = (item: any): { attributes: Record<string, string>, specifications: Record<string, string> } => {
  const attributes: Record<string, string> = {};
  const specifications: Record<string, string> = {};
  
  // Cas 1: L'élément a déjà des attributs et spécifications structurés
  if (item.attributes && typeof item.attributes === 'object') {
    Object.entries(item.attributes).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }
  
  if (item.specifications && typeof item.specifications === 'object') {
    Object.entries(item.specifications).forEach(([key, value]) => {
      specifications[key] = String(value);
    });
  } else if (item.variants && typeof item.variants === 'object') {
    // Compatible avec l'ancien format qui utilisait "variants"
    Object.entries(item.variants).forEach(([key, value]) => {
      specifications[key] = String(value);
    });
  }
  
  // Cas 2: Analyser le titre pour en extraire des spécifications si nécessaire
  if (Object.keys(specifications).length === 0 && item.title) {
    const { specs, attributes: parsedAttrs } = parseEquipmentSpecsFromText(item.title);
    
    // Ajouter les spécifications analysées
    Object.entries(specs).forEach(([key, value]) => {
      specifications[key] = value;
    });
    
    // Ajouter les attributs analysés
    Object.entries(parsedAttrs).forEach(([key, value]) => {
      attributes[key] = value;
    });
  }
  
  return { attributes, specifications };
};

/**
 * Migre les équipements existants du format JSON vers la nouvelle structure de tables
 */
export const migrateEquipmentFromJson = async (offerId: string, equipmentJson: string | any): Promise<boolean> => {
  try {
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
    
    // Gérer différents formats de données
    if (!Array.isArray(equipmentData)) {
      // Si ce n'est pas un tableau, essayons de vérifier si c'est un objet avec une propriété "items"
      if (equipmentData && typeof equipmentData === 'object' && equipmentData.items && Array.isArray(equipmentData.items)) {
        equipmentData = equipmentData.items;
      } else {
        console.error("Le format JSON n'est pas un tableau d'équipements");
        return false;
      }
    }
    
    console.log("Données d'équipement à migrer:", equipmentData);
    
    // Supprimer les anciens équipements s'ils existent
    await supabase
      .from('offer_equipment')
      .delete()
      .eq('offer_id', offerId);
    
    // Migrer chaque équipment
    for (const item of equipmentData) {
      console.log("Traitement de l'élément:", item);
      
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
      
      // Extraire les attributs et spécifications en gardant un log
      console.log("Extraction des attributs et spécifications pour:", newEquipment.title);
      
      let attributes: Record<string, string> = {};
      let specifications: Record<string, string> = {};
      
      // Cas 1: Traiter les attributs et spécifications déjà structurés
      if (item.attributes && typeof item.attributes === 'object') {
        attributes = Object.entries(item.attributes).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>);
        console.log("Attributs extraits directement:", attributes);
      }
      
      if (item.specifications && typeof item.specifications === 'object') {
        specifications = Object.entries(item.specifications).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>);
        console.log("Spécifications extraites directement:", specifications);
      } else if (item.variants && typeof item.variants === 'object') {
        // Compatible avec l'ancien format qui utilisait "variants"
        specifications = Object.entries(item.variants).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>);
        console.log("Variantes converties en spécifications:", specifications);
      }
      
      // Sauvegarder l'équipement avec ses attributs et spécifications
      await saveEquipment(newEquipment, attributes, specifications);
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
