
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AmbassadorFormValues } from "@/components/crm/forms/AmbassadorForm";

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  clientsCount: number;
  commissionsTotal: number;
  lastCommission: number;
  status: string;
  notes?: string;
}

// Function to map database record to our Ambassador interface
const mapDbAmbassadorToAmbassador = (record: any): Ambassador => {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone || "",
    region: record.region || "",
    clientsCount: record.clients_count || 0,
    commissionsTotal: record.commissions_total || 0,
    lastCommission: record.last_commission || 0,
    status: record.status || "active",
    notes: record.notes
  };
};

// Get all ambassadors
export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data ? data.map(mapDbAmbassadorToAmbassador) : [];
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    throw error;
  }
};

// Get ambassador by ID
export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data ? mapDbAmbassadorToAmbassador(data) : null;
  } catch (error) {
    console.error("Error fetching ambassador by ID:", error);
    throw error;
  }
};

// Create a new ambassador
export const createAmbassador = async (ambassadorData: AmbassadorFormValues): Promise<Ambassador | null> => {
  try {
    // Convert form data to database structure
    const dbAmbassador = {
      name: ambassadorData.name,
      email: ambassadorData.email,
      phone: ambassadorData.phone || "",
      region: ambassadorData.region,
      notes: ambassadorData.notes || "",
      status: "active",
      clients_count: 0,
      commissions_total: 0,
      last_commission: 0
    };
    
    const { data, error } = await supabase
      .from('ambassadors')
      .insert(dbAmbassador)
      .select()
      .single();
    
    if (error) throw error;
    
    return data ? mapDbAmbassadorToAmbassador(data) : null;
  } catch (error) {
    console.error("Error creating ambassador:", error);
    throw error;
  }
};

// Update an ambassador
export const updateAmbassador = async (id: string, ambassadorData: Partial<AmbassadorFormValues>): Promise<Ambassador | null> => {
  try {
    // Convert form data to database structure
    const dbAmbassador: Record<string, any> = {};
    
    if (ambassadorData.name !== undefined) dbAmbassador.name = ambassadorData.name;
    if (ambassadorData.email !== undefined) dbAmbassador.email = ambassadorData.email;
    if (ambassadorData.phone !== undefined) dbAmbassador.phone = ambassadorData.phone;
    if (ambassadorData.region !== undefined) dbAmbassador.region = ambassadorData.region;
    if (ambassadorData.notes !== undefined) dbAmbassador.notes = ambassadorData.notes;
    if (ambassadorData.status !== undefined) dbAmbassador.status = ambassadorData.status;
    
    // Add updated_at timestamp
    dbAmbassador.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('ambassadors')
      .update(dbAmbassador)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data ? mapDbAmbassadorToAmbassador(data) : null;
  } catch (error) {
    console.error("Error updating ambassador:", error);
    throw error;
  }
};

// Delete an ambassador
export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting ambassador:", error);
    throw error;
  }
};

// Get ambassador's clients
export const getAmbassadorClients = async (ambassadorId: string): Promise<any[]> => {
  try {
    // First get the ambassador-client relationships
    const { data: relations, error: relationsError } = await supabase
      .from('ambassador_clients')
      .select('client_id')
      .eq('ambassador_id', ambassadorId);
    
    if (relationsError) throw relationsError;
    
    if (!relations || relations.length === 0) return [];
    
    // Get the client IDs
    const clientIds = relations.map(rel => rel.client_id);
    
    // Get the actual clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);
    
    if (clientsError) throw clientsError;
    
    return clients || [];
  } catch (error) {
    console.error("Error fetching ambassador clients:", error);
    throw error;
  }
};

// Get ambassador's commissions
export const getAmbassadorCommissions = async (ambassadorId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassador_commissions')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching ambassador commissions:", error);
    throw error;
  }
};
