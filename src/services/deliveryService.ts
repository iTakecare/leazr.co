import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContractEquipmentDeliveryData {
  delivery_type?: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  collaborator_id?: string;
  delivery_site_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_email?: string;
  delivery_contact_phone?: string;
}

/**
 * Met à jour les informations de livraison d'un équipement de contrat
 */
export const updateContractEquipmentDelivery = async (
  equipmentId: string,
  deliveryData: ContractEquipmentDeliveryData
): Promise<boolean> => {
  try {
    console.log("🚚 Mise à jour des infos de livraison:", { equipmentId, deliveryData });

    const { error } = await supabase
      .from('contract_equipment')
      .update({
        ...deliveryData,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour de la livraison:", error);
      toast.error("Erreur lors de la mise à jour des informations de livraison");
      return false;
    }

    console.log("✅ Informations de livraison mises à jour");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour de la livraison:", error);
    toast.error("Erreur lors de la mise à jour des informations de livraison");
    return false;
  }
};

/**
 * Récupère les informations de livraison d'un équipement de contrat
 */
export const getContractEquipmentDelivery = async (equipmentId: string): Promise<ContractEquipmentDeliveryData | null> => {
  try {
    const { data, error } = await supabase
      .from('contract_equipment')
      .select(`
        delivery_type,
        collaborator_id,
        delivery_site_id,
        delivery_address,
        delivery_city,
        delivery_postal_code,
        delivery_country,
        delivery_contact_name,
        delivery_contact_email,
        delivery_contact_phone
      `)
      .eq('id', equipmentId)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération des infos de livraison:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Exception lors de la récupération des infos de livraison:", error);
    return null;
  }
};

/**
 * Vérifie si tous les équipements d'un contrat ont leurs informations de livraison configurées
 */
export const checkContractDeliveryConfiguration = async (contractId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('contract_equipment')
      .select('id, delivery_type')
      .eq('contract_id', contractId);

    if (error) {
      console.error("❌ Erreur lors de la vérification de la configuration:", error);
      return false;
    }

    // Vérifier si tous les équipements ont un type de livraison défini
    return data?.every(item => item.delivery_type) ?? false;
  } catch (error) {
    console.error("❌ Exception lors de la vérification de la configuration:", error);
    return false;
  }
};