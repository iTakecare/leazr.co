
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
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'offre:", error);
    return { data: null, error };
  }
};
