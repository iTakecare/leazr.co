import { supabase } from "@/integrations/supabase/client";
import { DeliverySite, CreateDeliverySiteData } from "@/types/deliverySite";

/**
 * Récupère tous les sites de livraison d'un client
 */
export const getClientDeliverySites = async (clientId: string): Promise<DeliverySite[]> => {
  try {
    const { data, error } = await supabase
      .from('client_delivery_sites')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("❌ Erreur lors de la récupération des sites:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des sites:", error);
    return [];
  }
};

/**
 * Crée un nouveau site de livraison pour un client
 */
export const createDeliverySite = async (
  siteData: CreateDeliverySiteData
): Promise<DeliverySite> => {
  try {
    const { data, error } = await supabase
      .from('client_delivery_sites')
      .insert({
        ...siteData,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la création du site:", error);
      throw new Error("Erreur lors de la création du site de livraison");
    }

    return data;
  } catch (error) {
    console.error("❌ Exception lors de la création du site:", error);
    throw error;
  }
};

/**
 * Met à jour un site de livraison existant
 */
export const updateDeliverySite = async (
  siteId: string,
  updates: Partial<Omit<DeliverySite, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('client_delivery_sites')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour du site:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour du site:", error);
    return false;
  }
};

/**
 * Désactive un site de livraison (soft delete)
 */
export const deleteDeliverySite = async (siteId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('client_delivery_sites')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    if (error) {
      console.error("❌ Erreur lors de la désactivation du site:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la désactivation du site:", error);
    return false;
  }
};

/**
 * Définit un site comme site par défaut pour un client
 */
export const setDefaultDeliverySite = async (siteId: string, clientId: string): Promise<boolean> => {
  try {
    // D'abord, retirer le statut par défaut de tous les autres sites
    await supabase
      .from('client_delivery_sites')
      .update({ is_default: false })
      .eq('client_id', clientId);

    // Puis définir le nouveau site par défaut
    const { error } = await supabase
      .from('client_delivery_sites')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    if (error) {
      console.error("❌ Erreur lors de la définition du site par défaut:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la définition du site par défaut:", error);
    return false;
  }
};