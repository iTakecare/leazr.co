import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { EquipmentTracking, EquipmentMaintenance, EquipmentRequest, EquipmentAlert } from "@/types/equipment";

// ============= GESTION DES PRODUITS AVEC INVENTAIRE =============

export const getInventoryProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        assigned_profile:assigned_to(id, first_name, last_name)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory products:', error);
    throw error;
  }
};

export const updateProductInventory = async (
  productId: string, 
  updates: Partial<Product>
): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  } catch (error) {
    console.error('Error updating product inventory:', error);
    throw error;
  }
};

// ============= GESTION DU TRACKING =============

export const getEquipmentTracking = async (equipmentId?: string): Promise<EquipmentTracking[]> => {
  try {
    let query = supabase
      .from('equipment_tracking')
      .select(`
        *,
        equipment:products(id, name),
        creator:created_by(first_name, last_name),
        from_user:from_user_id(first_name, last_name),
        to_user:to_user_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching equipment tracking:', error);
    throw error;
  }
};

export const createEquipmentTracking = async (tracking: Omit<EquipmentTracking, 'id' | 'created_at' | 'updated_at'>): Promise<EquipmentTracking> => {
  try {
    const { data, error } = await supabase
      .from('equipment_tracking')
      .insert(tracking)
      .select()
      .single();

    if (error) throw error;
    return data as EquipmentTracking;
  } catch (error) {
    console.error('Error creating equipment tracking:', error);
    throw error;
  }
};

// ============= GESTION DE LA MAINTENANCE =============

export const getEquipmentMaintenance = async (equipmentId?: string): Promise<EquipmentMaintenance[]> => {
  try {
    let query = supabase
      .from('equipment_maintenance')
      .select(`
        *,
        equipment:products(id, name),
        creator:created_by(first_name, last_name)
      `)
      .order('scheduled_date', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching equipment maintenance:', error);
    throw error;
  }
};

export const createEquipmentMaintenance = async (
  maintenance: Omit<EquipmentMaintenance, 'id' | 'created_at' | 'updated_at'>
): Promise<EquipmentMaintenance> => {
  try {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .insert(maintenance)
      .select()
      .single();

    if (error) throw error;
    return data as EquipmentMaintenance;
  } catch (error) {
    console.error('Error creating equipment maintenance:', error);
    throw error;
  }
};

export const updateEquipmentMaintenance = async (
  id: string,
  updates: Partial<EquipmentMaintenance>
): Promise<EquipmentMaintenance> => {
  try {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EquipmentMaintenance;
  } catch (error) {
    console.error('Error updating equipment maintenance:', error);
    throw error;
  }
};

// ============= GESTION DES DEMANDES =============

export const getEquipmentRequests = async (): Promise<EquipmentRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_requests')
      .select(`
        *,
        equipment:products(id, name),
        requester:requester_id(first_name, last_name),
        approver:approved_by(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching equipment requests:', error);
    throw error;
  }
};

export const createEquipmentRequest = async (
  request: Omit<EquipmentRequest, 'id' | 'created_at' | 'updated_at'>
): Promise<EquipmentRequest> => {
  try {
    const { data, error } = await supabase
      .from('equipment_requests')
      .insert(request)
      .select()
      .single();

    if (error) throw error;
    return data as EquipmentRequest;
  } catch (error) {
    console.error('Error creating equipment request:', error);
    throw error;
  }
};

export const updateEquipmentRequest = async (
  id: string,
  updates: Partial<EquipmentRequest>
): Promise<EquipmentRequest> => {
  try {
    const { data, error } = await supabase
      .from('equipment_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EquipmentRequest;
  } catch (error) {
    console.error('Error updating equipment request:', error);
    throw error;
  }
};

// ============= GESTION DES ALERTES =============

export const getEquipmentAlerts = async (userId?: string): Promise<EquipmentAlert[]> => {
  try {
    let query = supabase
      .from('equipment_alerts')
      .select(`
        *,
        equipment:products(id, name)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`target_user_id.is.null,target_user_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching equipment alerts:', error);
    throw error;
  }
};

export const markAlertAsRead = async (alertId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('equipment_alerts')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', alertId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    throw error;
  }
};

export const dismissAlert = async (alertId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('equipment_alerts')
      .update({ 
        is_dismissed: true, 
        dismissed_at: new Date().toISOString() 
      })
      .eq('id', alertId);

    if (error) throw error;
  } catch (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
};

// ============= FONCTIONS UTILITAIRES =============

export const getInventoryStats = async () => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('status');

    if (error) throw error;

    const stats = {
      total: products?.length || 0,
      available: products?.filter(p => p.status === 'available').length || 0,
      assigned: products?.filter(p => p.status === 'assigned').length || 0,
      maintenance: products?.filter(p => p.status === 'maintenance').length || 0,
      retired: products?.filter(p => p.status === 'retired').length || 0,
      missing: products?.filter(p => p.status === 'missing').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    throw error;
  }
};

export const createMaintenanceAlerts = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('create_maintenance_alerts');
    if (error) throw error;
  } catch (error) {
    console.error('Error creating maintenance alerts:', error);
    throw error;
  }
};

export const getProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }
};