
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { Client, Collaborator, CreateClientData } from "@/types/client";
import { toast } from "sonner";
import { sendWelcomeEmail } from "./emailService";
import { createUserAccount, resetPassword } from "./accountService";

// Remove mock clients to prevent confusion with real data

const mapDbClientToClient = (record: any): Client => {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    company: record.company,
    phone: record.phone,
    address: record.address,
    notes: record.notes,
    status: record.status || 'active',
    vat_number: record.vat_number,
    city: record.city,
    postal_code: record.postal_code,
    country: record.country,
    collaborators: record.collaborators || [],
    user_id: record.user_id,
    has_user_account: record.has_user_account,
    user_account_created_at: record.user_account_created_at,
    created_at: record.created_at ? new Date(record.created_at) : new Date(),
    updated_at: record.updated_at ? new Date(record.updated_at) : new Date()
  };
};

export const getClients = async (): Promise<Client[]> => {
  try {
    console.log("Fetching clients from Supabase");
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }
    
    return data ? data.map(mapDbClientToClient) : [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    toast.error("Error fetching clients");
    return [];
  }
};

export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    console.log(`getClientById called with id: ${id}`);
    
    const specialRoutes = ['new', 'create'];
    if (!id || specialRoutes.includes(id.toLowerCase())) {
      console.log(`Special route detected: ${id} - Skipping client fetch`);
      return null;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`Invalid UUID format for client ID: ${id} - Returning null`);
      return null;
    }
    
    console.log(`Fetching client with ID: ${id}`);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error from Supabase:", error);
      throw error;
    }
    
    console.log(`Client data retrieved:`, data);
    return data ? mapDbClientToClient(data) : null;
  } catch (error) {
    console.error("Error fetching client by ID:", error);
    return null;
  }
};

export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in to create a client");
      return null;
    }
    
    console.log("Creating client with data:", clientData);
    
    // Important: Don't use logged in user's ID for the client's user_id
    // Instead, leave it null until a specific user account is created for this client
    const clientToCreate = {
      ...clientData,
      has_user_account: false,
      user_id: null // Explicitly set to null to avoid auto-assignments
    };
    
    console.log("Client to create:", clientToCreate);
    
    // Insert the client record
    const { data, error } = await supabase
      .from('clients')
      .insert(clientToCreate)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }
    
    if (!data || !data.id) {
      console.error("Client created but no data returned");
      throw new Error("Client created but no data returned");
    }
    
    console.log("Client created successfully:", data);
    
    return data ? mapDbClientToClient(data) : null;
  } catch (error) {
    console.error("Error creating client:", error);
    toast.error("Error creating client");
    return null;
  }
};

export const updateClient = async (id: string, clientData: Partial<CreateClientData>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data ? mapDbClientToClient(data) : null;
  } catch (error) {
    console.error("Error updating client:", error);
    toast.error("Error updating client");
    return null;
  }
};

export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id')
      .eq('client_id', id);
    
    if (offersError) {
      console.error("Error checking associated offers:", offersError);
      throw offersError;
    }
    
    if (offers && offers.length > 0) {
      toast.error("Impossible de supprimer ce client car il a des offres associées");
      return false;
    }
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting client:", error);
    toast.error("Error deleting client");
    return false;
  }
};

export const verifyVatNumber = async (vatNumber: string): Promise<{ valid: boolean, companyName?: string, address?: string }> => {
  // An actual VAT verification API would be better here
  try {
    console.log("Verifying VAT number:", vatNumber);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const cleanVatNumber = vatNumber.replace(/\s+/g, '').toUpperCase();
    
    const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,12}$/;
    const isValidFormat = vatRegex.test(cleanVatNumber);
    
    if (isValidFormat) {
      // This is simplified validation logic just for demo purposes
      // In production, you would call an actual VAT validation service
      if (cleanVatNumber.startsWith("BE") || 
          cleanVatNumber.startsWith("FR") || 
          cleanVatNumber.startsWith("LU") || 
          cleanVatNumber.startsWith("DE")) {
        
        let companyData = {
          companyName: "Test Company SA",
          address: "Test Street 1, 1000 Brussels, Belgium"
        };
        
        return {
          valid: true,
          companyName: companyData.companyName,
          address: companyData.address
        };
      }
    }
    
    return { valid: false };
  } catch (error) {
    console.error("Error verifying VAT number:", error);
    return { valid: false };
  }
};

export const addCollaborator = async (clientId: string, collaborator: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      toast.error("Client introuvable");
      return null;
    }
    
    const newCollaborator: Collaborator = {
      ...collaborator,
      id: crypto.randomUUID()
    };
    
    const existingCollaborators = client.collaborators || [];
    const updatedCollaborators = [...existingCollaborators, newCollaborator];
    
    const updated = await updateClient(clientId, { collaborators: updatedCollaborators });
    
    if (!updated) {
      throw new Error("Échec de la mise à jour du client");
    }
    
    toast.success("Collaborateur ajouté avec succès");
    return newCollaborator;
  } catch (error) {
    console.error("Error adding collaborator:", error);
    toast.error("Erreur lors de l'ajout du collaborateur");
    return null;
  }
};

export const removeCollaborator = async (clientId: string, collaboratorId: string): Promise<boolean> => {
  try {
    const client = await getClientById(clientId);
    if (!client || !client.collaborators) {
      toast.error("Client ou collaborateurs introuvables");
      return false;
    }
    
    const updatedCollaborators = client.collaborators.filter(c => c.id !== collaboratorId);
    
    const updated = await updateClient(clientId, { collaborators: updatedCollaborators });
    
    if (!updated) {
      throw new Error("Échec de la mise à jour du client");
    }
    
    toast.success("Collaborateur supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Error removing collaborator:", error);
    toast.error("Erreur lors de la suppression du collaborateur");
    return false;
  }
};

export const linkClientToAmbassador = async (clientId: string, ambassadorId: string): Promise<boolean> => {
  try {
    if (!clientId || !ambassadorId) {
      console.error("Missing required parameters for linkClientToAmbassador", { clientId, ambassadorId });
      toast.error("Missing client or ambassador ID");
      return false;
    }
    
    console.log("Linking client to ambassador:", {
      ambassadorId,
      clientId
    });
    
    // Use adminSupabase to bypass RLS
    const { error } = await adminSupabase
      .from("ambassador_clients")
      .insert({
        ambassador_id: ambassadorId,
        client_id: clientId
      });
    
    if (error) {
      console.error("Error linking client to ambassador:", error);
      
      // Check if it's a duplicate key violation (client already linked)
      if (error.code === "23505") {
        console.log("Client is already linked to this ambassador");
        return true;
      }
      
      toast.error("Error linking client to ambassador");
      return false;
    }
    
    console.log("Client successfully linked to ambassador");
    return true;
  } catch (error) {
    console.error("Exception when linking client to ambassador:", error);
    toast.error("Error linking client to ambassador");
    return false;
  }
};

export { createUserAccount as createAccountForClient, resetPassword as resetClientPassword };
