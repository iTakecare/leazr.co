
import { supabase } from "@/integrations/supabase/client";
import { migrateEquipmentFromJson } from "@/services/offers/offerEquipment";

/**
 * Migre toutes les données d'équipement des offres existantes du format JSON vers la nouvelle structure de tables
 */
export const migrateAllEquipmentData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Récupérer toutes les offres avec une description d'équipement
    const { data: offers, error } = await supabase
      .from('offers')
      .select('id, equipment_description')
      .not('equipment_description', 'is', null);
    
    if (error) {
      throw error;
    }
    
    if (!offers || offers.length === 0) {
      return { 
        success: true, 
        message: "Aucune offre avec des équipements à migrer n'a été trouvée." 
      };
    }
    
    console.log(`Début de la migration pour ${offers.length} offres...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Traiter chaque offre
    for (const offer of offers) {
      if (offer.equipment_description) {
        try {
          const migrationSuccess = await migrateEquipmentFromJson(offer.id, offer.equipment_description);
          
          if (migrationSuccess) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Échec de la migration pour l'offre ${offer.id}`);
          }
        } catch (offerError) {
          errorCount++;
          console.error(`Erreur lors de la migration de l'offre ${offer.id}:`, offerError);
        }
      }
    }
    
    return {
      success: true,
      message: `Migration terminée: ${successCount} offres migrées avec succès, ${errorCount} échecs.`
    };
  } catch (error) {
    console.error("Erreur lors de la migration des données d'équipement:", error);
    return {
      success: false,
      message: `Erreur lors de la migration: ${error.message || 'Erreur inconnue'}`
    };
  }
};
