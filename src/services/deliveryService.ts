import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractEquipmentDelivery, CreateContractEquipmentDelivery, EquipmentDeliveryConfig } from "@/types/contractDelivery";

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
 * Met à jour les informations de livraison d'un équipement de contrat (legacy)
 */
export const updateContractEquipmentLegacyDelivery = async (
  equipmentId: string,
  deliveryData: ContractEquipmentDeliveryData
): Promise<boolean> => {
  try {
    console.log("🚚 Mise à jour des infos de livraison (legacy):", { equipmentId, deliveryData });

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
 * Créer les livraisons individuelles d'un équipement
 */
export const createContractEquipmentDeliveries = async (
  config: EquipmentDeliveryConfig
): Promise<ContractEquipmentDelivery[]> => {
  try {
    console.log("🚚 Création des livraisons individuelles:", config);

    const deliveriesToCreate: CreateContractEquipmentDelivery[] = config.deliveryItems.map(item => ({
      contract_equipment_id: config.equipmentId,
      quantity: item.quantity,
      serial_numbers: item.serialNumbers,
      delivery_type: item.deliveryType,
      collaborator_id: item.collaboratorId,
      delivery_site_id: item.deliverySiteId,
      delivery_address: item.deliveryAddress,
      delivery_city: item.deliveryCity,
      delivery_postal_code: item.deliveryPostalCode,
      delivery_country: item.deliveryCountry || 'BE',
      delivery_contact_name: item.deliveryContactName,
      delivery_contact_email: item.deliveryContactEmail,
      delivery_contact_phone: item.deliveryContactPhone,
      notes: item.notes
    }));

    const { data, error } = await supabase
      .from('contract_equipment_deliveries')
      .insert(deliveriesToCreate)
      .select('*');

    if (error) {
      console.error("❌ Erreur lors de la création des livraisons:", error);
      toast.error("Erreur lors de la création des livraisons");
      throw error;
    }

    console.log("✅ Livraisons créées avec succès");
    toast.success(`${data.length} livraisons créées avec succès`);
    return data;
  } catch (error) {
    console.error("❌ Exception lors de la création des livraisons:", error);
    toast.error("Erreur lors de la création des livraisons");
    throw error;
  }
};

/**
 * Récupérer toutes les livraisons d'un équipement
 */
export const getContractEquipmentDeliveries = async (equipmentId: string): Promise<ContractEquipmentDelivery[]> => {
  try {
    const { data, error } = await supabase
      .from('contract_equipment_deliveries')
      .select('*')
      .eq('contract_equipment_id', equipmentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("❌ Erreur lors de la récupération des livraisons:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des livraisons:", error);
    return [];
  }
};

/**
 * Récupérer toutes les livraisons individuelles pour un contrat
 */
export const getContractDeliveries = async (
  contractId: string
): Promise<Record<string, ContractEquipmentDelivery[]>> => {
  try {
    console.log("🚚 Récupération des livraisons pour le contrat:", contractId);

    const { data, error } = await supabase
      .from('contract_equipment_deliveries')
      .select(`
        *,
        contract_equipment!inner(
          id,
          contract_id
        )
      `)
      .eq('contract_equipment.contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("❌ Erreur lors de la récupération des livraisons du contrat:", error);
      throw error;
    }

    // Grouper les livraisons par équipement
    const groupedDeliveries: Record<string, ContractEquipmentDelivery[]> = {};
    data?.forEach(delivery => {
      const equipmentId = delivery.contract_equipment_id;
      if (!groupedDeliveries[equipmentId]) {
        groupedDeliveries[equipmentId] = [];
      }
      groupedDeliveries[equipmentId].push(delivery);
    });

    console.log(`✅ Livraisons récupérées pour ${Object.keys(groupedDeliveries).length} équipements`);
    return groupedDeliveries;
  } catch (error) {
    console.error("❌ Exception lors de la récupération des livraisons du contrat:", error);
    throw error;
  }
};

/**
 * Mettre à jour une livraison individuelle
 */
export const updateContractEquipmentDelivery = async (
  deliveryId: string,
  updates: Partial<CreateContractEquipmentDelivery>
): Promise<boolean> => {
  try {
    console.log("🚚 Mise à jour de la livraison:", { deliveryId, updates });

    const { error } = await supabase
      .from('contract_equipment_deliveries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
      return false;
    }

    console.log("✅ Livraison mise à jour");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour:", error);
    toast.error("Erreur lors de la mise à jour");
    return false;
  }
};

/**
 * Supprimer une livraison individuelle
 */
export const deleteContractEquipmentDelivery = async (deliveryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contract_equipment_deliveries')
      .delete()
      .eq('id', deliveryId);

    if (error) {
      console.error("❌ Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
      return false;
    }

    toast.success("Livraison supprimée");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la suppression:", error);
    toast.error("Erreur lors de la suppression");
    return false;
  }
};

/**
 * Vérifie si tous les équipements d'un contrat ont leurs informations de livraison configurées
 */
export const checkContractDeliveryConfiguration = async (contractId: string): Promise<boolean> => {
  try {
    // Récupérer tous les équipements du contrat
    const { data: equipment, error: equipmentError } = await supabase
      .from('contract_equipment')
      .select('id, quantity')
      .eq('contract_id', contractId);

    if (equipmentError) {
      console.error("❌ Erreur lors de la récupération des équipements:", equipmentError);
      return false;
    }

    if (!equipment || equipment.length === 0) {
      return false;
    }

    // Vérifier chaque équipement
    for (const eq of equipment) {
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('contract_equipment_deliveries')
        .select('quantity')
        .eq('contract_equipment_id', eq.id);

      if (deliveriesError) {
        console.error("❌ Erreur lors de la récupération des livraisons:", deliveriesError);
        return false;
      }

      const totalDeliveryQuantity = deliveries?.reduce((sum, d) => sum + d.quantity, 0) || 0;
      
      // Vérifier que la quantité totale des livraisons correspond à la quantité de l'équipement
      if (totalDeliveryQuantity !== eq.quantity) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la vérification de la configuration:", error);
    return false;
  }
};