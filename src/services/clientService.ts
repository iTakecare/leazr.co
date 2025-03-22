
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { Client, Collaborator, CreateClientData } from "@/types/client";
import { toast } from "sonner";
import { sendWelcomeEmail } from "./emailService";
import { createUserAccount, resetPassword } from "./accountService";

// Fonction de mapping pour convertir un enregistrement de la base de données en objet Client
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

// Récupérer tous les clients
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

// Récupérer un client par son ID
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

// Créer un nouveau client
export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vous devez être connecté pour créer un client");
      return null;
    }
    
    console.log("Creating client with data:", clientData);
    
    // Le user_id est laissé à null jusqu'à la création d'un compte utilisateur spécifique pour ce client
    const clientToCreate = {
      ...clientData,
      has_user_account: false,
      user_id: null
    };
    
    console.log("Client to create:", clientToCreate);
    
    // Insertion du client dans la base de données
    const { data, error } = await supabase
      .from('clients')
      .insert(clientToCreate)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error details:", error);
      
      // Log l'erreur pour diagnostic
      await supabase.from("error_logs").insert({
        user_id: user.id,
        error_context: "createClient",
        error_message: JSON.stringify(error),
        request_data: clientToCreate
      });
      
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

// Mettre à jour un client existant
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

// Supprimer un client
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    // Vérifier si le client a des offres associées
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

// Vérifier un numéro de TVA
export const verifyVatNumber = async (vatNumber: string): Promise<{ valid: boolean, companyName?: string, address?: string }> => {
  // Un vrai service de vérification de TVA serait préférable ici
  try {
    console.log("Verifying VAT number:", vatNumber);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const cleanVatNumber = vatNumber.replace(/\s+/g, '').toUpperCase();
    
    const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,12}$/;
    const isValidFormat = vatRegex.test(cleanVatNumber);
    
    if (isValidFormat) {
      // Logique de validation simplifiée pour la démonstration
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

// Ajouter un collaborateur à un client
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

// Supprimer un collaborateur d'un client
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

export { createUserAccount as createAccountForClient, resetPassword as resetClientPassword };
