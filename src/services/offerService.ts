
import { supabase } from '@/integrations/supabase/client';
import { OfferData } from './offers/types';

/**
 * Create a new offer
 */
export const createOffer = async (offerData: OfferData) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select('*');

    if (error) {
      console.error('Error creating offer:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createOffer:', error);
    return { data: null, error };
  }
};

/**
 * Récupère tous les équipements d'une offre avec leurs attributs et spécifications
 */
export const getOfferEquipment = async (offerId: string) => {
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
    
    const equipmentWithDetails = [];
    
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
 * Force la migration des données d'équipement pour une offre spécifique
 */
export const forceMigrateEquipmentData = async (offerId: string) => {
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
    const { error: deleteError } = await supabase
      .from('offer_equipment')
      .delete()
      .eq('offer_id', offerId);
      
    if (deleteError) {
      console.error("Erreur lors de la suppression des anciens équipements:", deleteError);
    }
    
    // Migrer chaque équipement
    for (const item of equipmentData) {
      // Créer l'équipement de base
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('offer_equipment')
        .insert({
          offer_id: offerId,
          title: item.title || "Produit sans nom",
          purchase_price: Number(item.purchasePrice || item.purchase_price) || 0,
          quantity: Number(item.quantity) || 1,
          margin: Number(item.margin) || 0,
          monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
          serial_number: item.serialNumber || item.serial_number
        })
        .select()
        .single();
      
      if (equipmentError) {
        console.error("Erreur lors de la création de l'équipement:", equipmentError);
        continue;
      }
      
      // Extraire et sauvegarder les attributs
      if (item.attributes) {
        let attributesToInsert = [];
        
        if (Array.isArray(item.attributes)) {
          attributesToInsert = item.attributes.map(attr => ({
            equipment_id: equipmentData.id,
            key: attr.key,
            value: String(attr.value)
          }));
        } else if (typeof item.attributes === 'object') {
          attributesToInsert = Object.entries(item.attributes).map(([key, value]) => ({
            equipment_id: equipmentData.id,
            key,
            value: String(value)
          }));
        }
        
        if (attributesToInsert.length > 0) {
          const { error: attrError } = await supabase
            .from('offer_equipment_attributes')
            .insert(attributesToInsert);
            
          if (attrError) {
            console.error("Erreur lors de la sauvegarde des attributs:", attrError);
          }
        }
      }
      
      // Extraire et sauvegarder les spécifications
      if (item.specifications || item.variants) {
        let specsToInsert = [];
        
        if (item.specifications) {
          if (Array.isArray(item.specifications)) {
            specsToInsert = item.specifications.map(spec => ({
              equipment_id: equipmentData.id,
              key: spec.key,
              value: String(spec.value)
            }));
          } else if (typeof item.specifications === 'object') {
            specsToInsert = Object.entries(item.specifications).map(([key, value]) => ({
              equipment_id: equipmentData.id,
              key,
              value: String(value)
            }));
          }
        } else if (item.variants && typeof item.variants === 'object') {
          // Support pour l'ancien format qui utilisait "variants"
          specsToInsert = Object.entries(item.variants).map(([key, value]) => ({
            equipment_id: equipmentData.id,
            key,
            value: String(value)
          }));
        }
        
        if (specsToInsert.length > 0) {
          const { error: specError } = await supabase
            .from('offer_equipment_specifications')
            .insert(specsToInsert);
            
          if (specError) {
            console.error("Erreur lors de la sauvegarde des spécifications:", specError);
          }
        }
      }
    }
    
    console.log(`Migration terminée avec succès pour l'offre ${offerId}`);
    return true;
    
  } catch (error) {
    console.error("Erreur lors de la migration des équipements:", error);
    return false;
  }
};
