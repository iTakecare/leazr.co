
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Client, CreateClientData, Collaborator } from "@/types/client";

// Function to create a user account for a client
export const createAccountForClient = async (clientId: string) => {
  try {
    const adminSupabase = getAdminSupabaseClient();
    
    // Get the client information
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (clientError || !client) {
      throw new Error("Client non trouvé");
    }
    
    // Check if the user already exists
    if (client.user_id) {
      return { success: true, message: "Ce client a déjà un compte utilisateur" };
    }
    
    // Check if the email is valid
    if (!client.email) {
      throw new Error("L'email du client n'est pas défini");
    }
    
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Create a user account
    const { data: user, error } = await adminSupabase.auth.admin.createUser({
      email: client.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: client.name,
        role: 'client'
      }
    });
    
    if (error) {
      throw error;
    }
    
    // Update the client with the user ID
    const { error: updateError } = await adminSupabase
      .from('clients')
      .update({
        user_id: user.user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', client.id);
    
    if (updateError) {
      throw updateError;
    }
    
    return {
      success: true,
      user: user.user,
      message: "Compte utilisateur créé avec succès"
    };
  } catch (error: any) {
    console.error("Erreur lors de la création du compte:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de la création du compte utilisateur"
    };
  }
};

// Function to reset a user's password
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    
    if (error) throw error;
    
    return {
      success: true,
      message: "Instructions de réinitialisation envoyées"
    };
  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de la réinitialisation"
    };
  }
};

// Get all clients
export const getClients = async (): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    toast.error("Erreur lors du chargement des clients");
    return [];
  }
};

// Get a client by ID
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching client:", error);
    toast.error("Erreur lors du chargement du client");
    return null;
  }
};

// Create a new client
export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    toast.success("Client créé avec succès");
    return data;
  } catch (error) {
    console.error("Error creating client:", error);
    toast.error("Erreur lors de la création du client");
    return null;
  }
};

// Update an existing client
export const updateClient = async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    toast.success("Client mis à jour avec succès");
    return data;
  } catch (error) {
    console.error("Error updating client:", error);
    toast.error("Erreur lors de la mise à jour du client");
    return null;
  }
};

// Delete a client
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting client:", error);
    toast.error("Erreur lors de la suppression du client");
    return false;
  }
};

// Add a collaborator to a client
export const addCollaborator = async (clientId: string, collaboratorData: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
  try {
    // In a real application, you would have a 'collaborators' table
    // For now, we'll simulate adding a collaborator by returning the data
    const collaborator: Collaborator = {
      id: Math.random().toString(36).substring(2, 11),
      ...collaboratorData
    };
    
    toast.success("Collaborateur ajouté avec succès");
    return collaborator;
  } catch (error) {
    console.error("Error adding collaborator:", error);
    toast.error("Erreur lors de l'ajout du collaborateur");
    return null;
  }
};

// Verify a VAT number
export const verifyVatNumber = async (vatNumber: string) => {
  try {
    console.log("Verification VAT number:", vatNumber);
    // For a demo, we accept any number starting with BE
    if (vatNumber.toUpperCase().startsWith('BE')) {
      // Simulate a network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        valid: true,
        companyName: vatNumber.toUpperCase().startsWith('BE0123') 
          ? "Test Company SA"
          : "Entreprise " + vatNumber.substring(2, 6),
        address: "123 Test Street, 1000 Brussels, Belgium"
      };
    }
    
    return {
      valid: false,
      error: "Format de TVA invalide"
    };
  } catch (error) {
    console.error("Erreur de vérification TVA:", error);
    return {
      valid: false,
      error: "Erreur lors de la vérification"
    };
  }
};

// Client service object with various methods
export const clientService = {
  verifyVatNumber: async (vatNumber: string) => {
    return verifyVatNumber(vatNumber);
  },
  
  // Add other client service methods here
};
