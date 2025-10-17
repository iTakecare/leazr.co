
import { supabase } from "@/integrations/supabase/client";
import { getOfferEquipment, convertEquipmentToJson } from "./offerEquipment";

export const getOfferById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Récupérer les équipements associés à cette offre
    const equipment = await getOfferEquipment(id);
    
    // Si des équipements sont trouvés, les ajouter à l'objet de retour
    if (equipment && equipment.length > 0) {
      // Mettre à jour le champ equipment_description pour la compatibilité
      data.equipment_description = convertEquipmentToJson(equipment);
      
      // Optionnellement, on pourrait ajouter les équipements directement dans un nouveau champ
      data.equipment_data = equipment;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'offre:", error);
    throw error;
  }
};

export const updateOffer = async (id: string, updates: any) => {
  try {
    console.log("🔄 UPDATING OFFER - ID:", id);
    console.log("🔄 UPDATING OFFER - Updates:", updates);
    
    // 1. Mettre à jour l'offre elle-même
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    // 2. Si equipment_description est fourni, synchroniser avec offer_equipment
    if (updates.equipment_description) {
      console.log("🔄 SYNCHRONIZING EQUIPMENT for offer:", id);
      
      try {
        // Supprimer les anciens équipements
        console.log("🗑️ Deleting existing equipment for offer:", id);
        const { error: deleteError } = await supabase
          .from('offer_equipment')
          .delete()
          .eq('offer_id', id);
        
        if (deleteError) {
          console.error("❌ Error deleting existing equipment:", deleteError);
        } else {
          console.log("✅ Existing equipment deleted successfully");
        }
        
        // Migrer les nouveaux équipements depuis le JSON
        console.log("📦 Migrating new equipment from JSON...");
        const { migrateEquipmentFromJson } = await import('./offerEquipment');
        const migrationSuccess = await migrateEquipmentFromJson(id, updates.equipment_description);
        
        if (migrationSuccess) {
          console.log("✅ Equipment migration successful for offer:", id);
        } else {
          console.warn("⚠️ Equipment migration failed for offer:", id);
        }
      } catch (equipmentError) {
        console.error("❌ Error synchronizing equipment:", equipmentError);
        // Ne pas faire échouer la mise à jour de l'offre pour autant
      }
    }
    
    console.log("✅ OFFER UPDATED successfully:", data);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour de l'offre:", error);
    return { data: null, error };
  }
};

export const updateOfferDate = async (offerId: string, newDate: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('update_offer_date_secure', {
      p_offer_id: offerId,
      p_new_date: newDate
    });
    
    if (error) {
      console.error("Error updating offer date:", error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error("Error in updateOfferDate:", error);
    return false;
  }
};

export const updateOfferRequestDate = async (offerId: string, newDate: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('update_offer_request_date_secure', {
      p_offer_id: offerId,
      p_new_date: newDate
    });
    
    if (error) {
      console.error("Error updating offer request date:", error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error("Error in updateOfferRequestDate:", error);
    return false;
  }
};
