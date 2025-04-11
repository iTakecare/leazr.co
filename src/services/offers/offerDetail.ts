
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
      
      // Ajouter les équipements directement dans un nouveau champ
      data.equipment_data = equipment;
      
      // Créer un champ parsedEquipment pour l'affichage
      data.parsedEquipment = equipment.map(item => {
        // Convertir les attributs et spécifications au format attendu par les composants
        const attributes: Record<string, string> = {};
        const specifications: Record<string, string> = {};
        
        if (item.attributes && Array.isArray(item.attributes)) {
          item.attributes.forEach(attr => {
            attributes[attr.key] = attr.value;
          });
        }
        
        if (item.specifications && Array.isArray(item.specifications)) {
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
    } else {
      // Si aucun équipement n'est trouvé, essayer de parser le JSON
      try {
        if (data.equipment_description) {
          let parsed;
          try {
            parsed = typeof data.equipment_description === 'string' 
              ? JSON.parse(data.equipment_description) 
              : data.equipment_description;
          } catch (e) {
            console.error("Erreur lors du parsing JSON:", e);
            parsed = [];
          }
          
          data.parsedEquipment = Array.isArray(parsed) ? parsed : [];
        } else {
          data.parsedEquipment = [];
        }
      } catch (e) {
        console.error("Erreur lors du parsing de equipment_description:", e);
        data.parsedEquipment = [];
      }
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
