import { supabase } from "@/integrations/supabase/client";
import { DeliverySite, CreateDeliverySiteData } from "@/types/deliverySite";

/**
 * Get all delivery sites for a client
 */
export const getDeliverySitesByClientId = async (clientId: string): Promise<DeliverySite[]> => {
  try {
    const { data, error } = await supabase
      .from('client_delivery_sites')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('site_name', { ascending: true });

    if (error) {
      console.error('Error fetching delivery sites:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDeliverySitesByClientId:', error);
    throw error;
  }
};

/**
 * Create a new delivery site
 */
export const createDeliverySite = async (data: CreateDeliverySiteData): Promise<DeliverySite | null> => {
  try {
    // If this site should be default, unset all other defaults first
    if (data.is_default) {
      await supabase
        .from('client_delivery_sites')
        .update({ is_default: false })
        .eq('client_id', data.client_id);
    }

    const { data: newSite, error } = await supabase
      .from('client_delivery_sites')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery site:', error);
      throw error;
    }

    return newSite;
  } catch (error) {
    console.error('Error in createDeliverySite:', error);
    return null;
  }
};

/**
 * Update an existing delivery site
 */
export const updateDeliverySite = async (id: string, updates: Partial<DeliverySite>): Promise<DeliverySite | null> => {
  try {
    // If this site should be default, unset all other defaults first
    if (updates.is_default && updates.client_id) {
      await supabase
        .from('client_delivery_sites')
        .update({ is_default: false })
        .eq('client_id', updates.client_id);
    }

    const { data, error } = await supabase
      .from('client_delivery_sites')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery site:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateDeliverySite:', error);
    return null;
  }
};

/**
 * Delete a delivery site
 */
export const deleteDeliverySite = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('client_delivery_sites')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting delivery site:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteDeliverySite:', error);
    return false;
  }
};

/**
 * Set a delivery site as default
 */
export const setDeliverySiteAsDefault = async (id: string, clientId: string): Promise<boolean> => {
  try {
    // First, unset all defaults for this client
    await supabase
      .from('client_delivery_sites')
      .update({ is_default: false })
      .eq('client_id', clientId);

    // Then set the selected site as default
    const { error } = await supabase
      .from('client_delivery_sites')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      console.error('Error setting default delivery site:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setDeliverySiteAsDefault:', error);
    return false;
  }
};