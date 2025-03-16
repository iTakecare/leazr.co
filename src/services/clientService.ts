import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { Client, Collaborator, CreateClientData } from "@/types/client";
import { toast } from "sonner";
import { sendWelcomeEmail } from "./emailService";
import { createUserAccount, resetPassword } from "./accountService";

const mockClients = [
  {
    id: "1",
    name: "Jean Saisrien",
    email: "jsr@acmebelgium.be",
    company: "ACME BELGIUM SA",
    phone: "0123456789",
    vat_number: "BE0123456789",
    address: "Rue de la Loi 1",
    city: "Bruxelles",
    postal_code: "1000",
    country: "BE",
    status: "active",
    collaborators: [
      {
        id: "c1",
        name: "Annie Versaire",
        role: "CFO",
        email: "av@acmebelgium.be",
        phone: "0123456789",
        department: "Finances"
      },
      {
        id: "c2",
        name: "Alain Dien",
        role: "CMO",
        email: "ad@acmecorp.be",
        phone: "0987654321",
        department: "Marketing"
      }
    ],
    created_at: "2023-01-15T10:00:00Z",
    updated_at: "2023-01-15T10:00:00Z"
  },
  {
    id: "2",
    name: "Marie Martin",
    email: "marie.martin@example.com",
    company: "Martin & Co",
    phone: "07 98 76 54 32",
    created_at: "2023-02-20T14:30:00Z",
    updated_at: "2023-02-20T14:30:00Z"
  },
  {
    id: "3",
    name: "Pierre Lefevre",
    email: "pierre.lefevre@example.com",
    company: "Lefevre Tech",
    phone: "06 55 44 33 22",
    created_at: "2023-03-10T09:15:00Z",
    updated_at: "2023-03-10T09:15:00Z"
  }
];

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
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        console.log("Timeout atteint, utilisation des données mockées");
        reject(new Error("Timeout lors de la récupération des clients"));
      }, 5000)
    );
    
    const fetchPromise = supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) throw error;
    
    return data ? data.map(mapDbClientToClient) : [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    return mockClients.map(mapDbClientToClient);
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
    const mockClient = mockClients.find(c => c.id === id);
    return mockClient ? mapDbClientToClient(mockClient) : null;
  }
};

export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vous devez être connecté pour créer un client");
      return null;
    }
    
    console.log("Creating client with data:", clientData);
    
    const clientWithUserId = {
      ...clientData,
      user_id: user.id,
      has_user_account: false
    };
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clientWithUserId)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }
    
    console.log("Client created successfully:", data);
    
    return data ? mapDbClientToClient(data) : null;
  } catch (error) {
    console.error("Error creating client:", error);
    toast.error("Erreur lors de la création du client");
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
    toast.error("Erreur lors de la mise à jour du client");
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
    toast.error("Erreur lors de la suppression du client");
    return false;
  }
};

export const verifyVatNumber = async (vatNumber: string): Promise<{ valid: boolean, companyName?: string, address?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const cleanVatNumber = vatNumber.replace(/\s+/g, '').toUpperCase();
  
  const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,12}$/;
  const isValidFormat = vatRegex.test(cleanVatNumber);
  
  if (isValidFormat) {
    if (cleanVatNumber === "BE0123456789" || 
        cleanVatNumber === "FR12345678901" || 
        cleanVatNumber === "LU12345678" || 
        cleanVatNumber === "DE123456789") {
      
      let companyData = {
        companyName: "ACME BELGIUM SA",
        address: "Rue de la Loi 1, 1000 Bruxelles, Belgique"
      };
      
      if (cleanVatNumber.startsWith("FR")) {
        companyData = {
          companyName: "ACME FRANCE SAS",
          address: "Avenue des Champs-Élysées 1, 75008 Paris, France"
        };
      } else if (cleanVatNumber.startsWith("DE")) {
        companyData = {
          companyName: "ACME DEUTSCHLAND GMBH",
          address: "Unter den Linden 1, 10117 Berlin, Deutschland"
        };
      } else if (cleanVatNumber.startsWith("LU")) {
        companyData = {
          companyName: "ACME LUXEMBOURG SA",
          address: "Boulevard Royal 1, 2449 Luxembourg, Luxembourg"
        };
      }
      
      return {
        valid: true,
        companyName: companyData.companyName,
        address: companyData.address
      };
    }
  }
  
  return { valid: false };
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
    
    const mockClientIndex = mockClients.findIndex(c => c.id === clientId);
    if (mockClientIndex >= 0) {
      if (!mockClients[mockClientIndex].collaborators) {
        mockClients[mockClientIndex].collaborators = [];
      }
      const mockCompatibleCollaborator = {
        ...newCollaborator,
        phone: newCollaborator.phone || "",
        department: newCollaborator.department || ""
      };
      mockClients[mockClientIndex].collaborators!.push(mockCompatibleCollaborator);
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
    
    const mockClientIndex = mockClients.findIndex(c => c.id === clientId);
    if (mockClientIndex >= 0 && mockClients[mockClientIndex].collaborators) {
      mockClients[mockClientIndex].collaborators = updatedCollaborators.map(c => ({
        ...c,
        phone: c.phone || "",
        department: c.department || ""
      }));
    }
    
    toast.success("Collaborateur supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Error removing collaborator:", error);
    toast.error("Erreur lors de la suppression du collaborateur");
    return false;
  }
};

/**
 * Crée un compte utilisateur pour un client
 */
export const createAccountForClient = async (client: Client): Promise<boolean> => {
  try {
    if (!client.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return false;
    }

    console.log(`Création d'un compte pour le client ${client.name} (${client.email})`);
    
    // Vérifier si un utilisateur existe déjà
    const { data: { user: existingUser }, error: checkError } = await supabase.auth.admin.getUserByEmail(client.email);
    
    if (checkError && checkError.message !== "User not found") {
      console.error("Erreur lors de la vérification de l'utilisateur:", checkError);
      toast.error(`Erreur: ${checkError.message}`);
      return false;
    }
    
    if (existingUser) {
      // Si l'utilisateur existe mais n'est pas associé au client
      if (!client.user_id) {
        console.log(`Utilisateur existant trouvé pour ${client.email}, association au client ${client.id}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            user_id: existingUser.id,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', client.id);
          
        if (updateError) {
          console.error("Erreur lors de l'association:", updateError);
          toast.error(`Erreur: ${updateError.message}`);
          return false;
        }
        
        // Envoyer un email de bienvenue (indiquant compte existant)
        await sendWelcomeEmail(client.email, client.name, "client", false);
        
        toast.success(`Compte associé au client ${client.name}`);
        return true;
      } else {
        toast.error(`Un compte existe déjà pour cet email`);
        return false;
      }
    }
    
    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-12);
    
    // Créer l'utilisateur
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: client.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        name: client.name,
        role: 'client',
        client_id: client.id
      }
    });
    
    if (createError) {
      console.error("Erreur lors de la création de l'utilisateur:", createError);
      toast.error(`Erreur: ${createError.message}`);
      return false;
    }
    
    if (!userData || !userData.user) {
      console.error("Création de l'utilisateur n'a pas retourné les données attendues");
      toast.error("Erreur lors de la création du compte");
      return false;
    }
    
    console.log("Utilisateur créé avec succès:", userData.user.id);
    
    // Mettre à jour le client avec l'ID utilisateur
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        user_id: userData.user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', client.id);
    
    if (updateError) {
      console.error("Erreur lors de la mise à jour du client:", updateError);
      toast.error(`Erreur: ${updateError.message}`);
      return false;
    }
    
    // Envoyer l'email de réinitialisation de mot de passe
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (resetError) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", resetError);
      toast.warning("Compte créé mais problème d'envoi de l'email de réinitialisation");
      // On continue malgré l'erreur
    }
    
    // Envoyer l'email de bienvenue
    await sendWelcomeEmail(client.email, client.name, "client");
    
    return true;
  } catch (error) {
    console.error("Erreur dans createAccountForClient:", error);
    toast.error("Erreur lors de la création du compte client");
    return false;
  }
};

/**
 * Réinitialise le mot de passe d'un client
 */
export const resetClientPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erreur dans resetClientPassword:", error);
    return false;
  }
};

export { createUserAccount as createAccountForClient, resetPassword as resetClientPassword };
