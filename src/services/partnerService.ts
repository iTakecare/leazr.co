
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Define the allowed partner types as a literal union type
export const partnerTypes = ["Revendeur", "Intégrateur", "Consultant"] as const;
export type PartnerType = typeof partnerTypes[number];

// Partner form values schema with Zod
export const partnerSchema = z.object({
  name: z.string().min(2, "Le nom de la société doit contenir au moins 2 caractères"),
  contactName: z.string().min(2, "Le nom du contact doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().optional(),
  type: z.enum(partnerTypes),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
  commission_level_id: z.string().optional(),
});

export type PartnerFormValues = z.infer<typeof partnerSchema>;

// Interface Partner complète
export interface Partner {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  type: PartnerType;
  status: string;
  notes?: string;
  clientsCount?: number;
  revenueTotal?: number;
  lastTransaction?: number;
  commissionsTotal: number;
  collaborators?: any[];
  clients?: any[];
  commissions?: any[];
  offers?: any[];
  created_at?: Date;
  updated_at?: Date;
  has_user_account?: boolean;
  user_account_created_at?: string | Date;
  user_id?: string;
  commission_level_id?: string;
}

// Function to map database record to our Partner interface
const mapDbPartnerToPartner = (record: any): Partner => {
  return {
    id: record.id,
    name: record.name,
    contactName: record.contact_name,
    email: record.email,
    phone: record.phone || "",
    type: record.type as PartnerType,
    clientsCount: record.clients_count || 0,
    revenueTotal: record.revenue_total || 0,
    lastTransaction: record.last_transaction || 0,
    status: record.status || "active",
    notes: record.notes,
    user_id: record.user_id,
    commissionsTotal: 0, // Set a default value instead of using the non-existent column
    created_at: record.created_at ? new Date(record.created_at) : undefined,
    updated_at: record.updated_at ? new Date(record.updated_at) : undefined,
    has_user_account: record.has_user_account || false,
    user_account_created_at: record.user_account_created_at,
    commission_level_id: record.commission_level_id,
  };
};

// Function to map Partner interface to database record format
const mapPartnerToDbPartner = (partner: Partial<PartnerFormValues>): Record<string, any> => {
  const dbPartner: Record<string, any> = {};
  
  if (partner.name !== undefined) dbPartner.name = partner.name;
  if (partner.contactName !== undefined) dbPartner.contact_name = partner.contactName;
  if (partner.email !== undefined) dbPartner.email = partner.email;
  if (partner.phone !== undefined) dbPartner.phone = partner.phone;
  if (partner.type !== undefined) dbPartner.type = partner.type;
  if (partner.notes !== undefined) dbPartner.notes = partner.notes;
  if (partner.status !== undefined) dbPartner.status = partner.status;
  if (partner.commission_level_id !== undefined) dbPartner.commission_level_id = partner.commission_level_id;
  
  return dbPartner;
};

// Get all partners
export const getPartners = async (): Promise<Partner[]> => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data ? data.map(mapDbPartnerToPartner) : [];
  } catch (error) {
    console.error("Error fetching partners:", error);
    throw error;
  }
};

// Get partner by ID
export const getPartnerById = async (id: string): Promise<Partner | null> => {
  try {
    console.log("Fetching partner with ID:", id);
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error in getPartnerById:", error);
      throw error;
    }
    
    console.log("Partner data loaded:", data);
    return data ? mapDbPartnerToPartner(data) : null;
  } catch (error) {
    console.error("Error fetching partner by ID:", error);
    throw error;
  }
};

// Create a new partner
export const createPartner = async (partnerData: PartnerFormValues): Promise<Partner | null> => {
  try {
    // Get the current authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      toast.error("Erreur d'authentification. Veuillez vous reconnecter.");
      throw userError;
    }
    
    if (!userData.user) {
      console.error("No authenticated user found");
      toast.error("Vous devez être connecté pour créer un partenaire");
      throw new Error("No authenticated user");
    }
    
    // Convert form data to database structure with user_id
    const dbPartner = {
      name: partnerData.name,
      contact_name: partnerData.contactName,
      email: partnerData.email,
      phone: partnerData.phone || "",
      type: partnerData.type,
      notes: partnerData.notes || "",
      status: partnerData.status || "active",
      clients_count: 0,
      revenue_total: 0,
      last_transaction: 0,
      user_id: userData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log("Creating partner with data:", dbPartner);
    
    const { data, error } = await supabase
      .from('partners')
      .insert(dbPartner)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating partner:", error);
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
    
    toast.success("Partenaire créé avec succès!");
    return data ? mapDbPartnerToPartner(data) : null;
  } catch (error) {
    console.error("Error creating partner:", error);
    toast.error("Erreur lors de la création du partenaire");
    throw error;
  }
};

// Update a partner
export const updatePartner = async (id: string, partnerData: Partial<PartnerFormValues>): Promise<Partner | null> => {
  try {
    // Convert form data to database structure
    const dbPartner = mapPartnerToDbPartner(partnerData);
    
    // Add updated_at timestamp
    dbPartner.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('partners')
      .update(dbPartner)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating partner:", error);
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
    
    toast.success("Partenaire mis à jour avec succès!");
    return data ? mapDbPartnerToPartner(data) : null;
  } catch (error) {
    console.error("Error updating partner:", error);
    toast.error("Erreur lors de la mise à jour du partenaire");
    throw error;
  }
};

// Delete a partner
export const deletePartner = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting partner:", error);
      toast.error(`Erreur: ${error.message}`);
      throw error;
    }
    
    toast.success("Partenaire supprimé avec succès!");
    return true;
  } catch (error) {
    console.error("Error deleting partner:", error);
    toast.error("Erreur lors de la suppression du partenaire");
    throw error;
  }
};

// Get partner's clients
export const getPartnerClients = async (partnerId: string): Promise<any[]> => {
  try {
    // First get the partner-client relationships
    const { data: relations, error: relationsError } = await supabase
      .from('partner_clients')
      .select('client_id')
      .eq('partner_id', partnerId);
    
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
    console.error("Error fetching partner clients:", error);
    throw error;
  }
};

// Get partner's commissions summary
export const getPartnerCommissionsSummary = async (partnerId: string): Promise<{ pending: number; paid: number; total: number }> => {
  try {
    const { data, error } = await supabase
      .from('partner_commissions')
      .select('amount, status')
      .eq('partner_id', partnerId);
    
    if (error) throw error;
    
    let pending = 0;
    let paid = 0;
    
    if (data) {
      data.forEach(commission => {
        if (commission.status === 'pending') {
          pending += Number(commission.amount);
        } else if (commission.status === 'paid') {
          paid += Number(commission.amount);
        }
      });
    }
    
    // Mettre à jour les totaux dans la table partners
    await supabase
      .from('partners')
      .update({
        revenue_total: paid + pending,
        last_transaction: data && data.length > 0 
          ? Math.max(...data.map(c => Number(c.amount)))
          : 0
      })
      .eq('id', partnerId);
    
    return {
      pending,
      paid,
      total: pending + paid
    };
  } catch (error) {
    console.error("Error calculating partner commissions:", error);
    return { pending: 0, paid: 0, total: 0 };
  }
};
