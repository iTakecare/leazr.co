
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'lead';
  user_id?: string;
  clients_count?: number;
  commissions_total?: number;
  last_commission?: number;
  created_at?: string;
  updated_at?: string;
  company?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  // Required properties for detail views
  has_user_account?: boolean;
  user_account_created_at?: string;
  // These properties are used in detail views but not in the API model
  clients?: any[];
  commissions?: any[];
  collaborators?: any[];
}

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*');
    
    if (error) {
      console.error('Error fetching ambassadors:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching ambassadors:', error);
    return [];
  }
};

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select(`
        *,
        clients:ambassador_clients(client_id),
        commissions:ambassador_commissions(id, amount, created_at)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching ambassador:', error);
      throw error;
    }
    
    // Calculate counts and totals
    const ambassador = data as Ambassador;
    
    if (ambassador) {
      ambassador.clients_count = ambassador.clients?.length || 0;
      
      // Calculate commissions total if commissions exist
      if (ambassador.commissions && ambassador.commissions.length > 0) {
        ambassador.commissions_total = ambassador.commissions.reduce(
          (total, commission) => total + (commission.amount || 0), 
          0
        );
        
        // Get the most recent commission
        const sortedCommissions = [...ambassador.commissions].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        ambassador.last_commission = sortedCommissions[0]?.amount || 0;
      } else {
        ambassador.commissions_total = 0;
        ambassador.last_commission = 0;
      }
    }
    
    return ambassador || null;
  } catch (error) {
    console.error('Error fetching ambassador:', error);
    return null;
  }
};

export const createAmbassador = async (data: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    console.log("Creating ambassador with data:", data);
    const ambassadorId = uuidv4();
    const newAmbassador = {
      id: ambassadorId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: data.status || 'active',
      has_user_account: false
    };
    
    const { data: insertedData, error } = await supabase
      .from('ambassadors')
      .insert(newAmbassador)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ambassador:', error);
      throw error;
    }
    
    console.log("Ambassador created successfully:", insertedData);
    return insertedData || null;
  } catch (error) {
    console.error('Error creating ambassador:', error);
    return null;
  }
};

export const updateAmbassador = async (id: string, data: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedData, error } = await supabase
      .from('ambassadors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ambassador:', error);
      throw error;
    }
    
    return updatedData || null;
  } catch (error) {
    console.error('Error updating ambassador:', error);
    return null;
  }
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting ambassador:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting ambassador:', error);
    return false;
  }
};
