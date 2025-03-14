
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { Client, Collaborator, CreateClientData } from "@/types/client";
import { toast } from "sonner";

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

export const createAccountForClient = async (client: Client): Promise<boolean> => {
  try {
    if (!client.email) {
      throw new Error("Email required to create account");
    }

    console.log("Creating account for client:", client.email);
    
    if (client.has_user_account === true) {
      console.log("Client already has a user account");
      toast.warning("Ce client a déjà un compte utilisateur associé");
      
      return await resetClientPassword(client.email);
    }
    
    const generateStrongPassword = () => {
      const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
      const numberChars = '0123456789';
      const specialChars = '!@#$%^&*()-_=+';
      
      const getRandomChar = (charSet: string) => charSet.charAt(Math.floor(Math.random() * charSet.length));
      
      let password = getRandomChar(uppercaseChars) + getRandomChar(lowercaseChars) + 
                    getRandomChar(numberChars) + getRandomChar(specialChars);
      
      for (let i = 0; i < 12; i++) {
        const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      return password.split('').sort(() => 0.5 - Math.random()).join('');
    };
    
    const tempPassword = generateStrongPassword();
    const siteUrl = window.location.origin;
    console.log("Using site URL for redirect:", siteUrl);
    
    try {
      // Since the adminSupabase client is having issues, we'll use the regular supabase client
      // We'll just set up the user, then send a password reset email to let them create their own password
      console.log("Creating user account with standard auth...");
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: client.email,
        password: tempPassword,
        options: {
          data: {
            first_name: client.name.split(' ')[0],
            last_name: client.name.split(' ').slice(1).join(' '),
            role: 'client',
            company: client.company || null
          }
        }
      });
      
      if (signUpError) {
        console.log("Standard auth signup error:", signUpError.message);
        throw signUpError;
      }
      
      console.log("New user created successfully:", signUpData?.user?.id);
      
      if (signUpData && signUpData.user) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            user_id: signUpData.user.id,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', client.id);
          
        if (updateError) {
          console.error("Error updating client with user_id:", updateError);
        } else {
          console.log("Client updated with user_id:", signUpData.user.id);
        }
      }
      
      console.log("Sending password reset email for new account");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(client.email, {
        redirectTo: `${siteUrl}/login`
      });
      
      if (resetError) {
        console.error("Error sending password reset:", resetError);
        toast.error("Erreur lors de l'envoi du mail de réinitialisation");
        return false;
      }
      
      toast.success("Email d'invitation envoyé au client avec succès");
      return true;
    } catch (innerError) {
      console.error("Error in authentication process:", innerError);
      toast.error("Erreur lors de la création du compte client");
      return false;
    }
  } catch (error) {
    console.error("Error in createAccountForClient:", error);
    toast.error("Erreur lors de la création du compte");
    return false;
  }
};

export const resetClientPassword = async (email: string): Promise<boolean> => {
  try {
    if (!email) {
      throw new Error("Email required to reset password");
    }

    console.log("Sending password reset email to:", email);
    
    const siteUrl = window.location.origin;
    console.log("Using site URL for redirect:", siteUrl);
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/login`
    });
    
    if (resetError) {
      console.error("Error sending password reset:", resetError);
      toast.error("Erreur lors de l'envoi du mail de réinitialisation");
      return false;
    }
    
    toast.success("Email de réinitialisation envoyé au client avec succès");
    return true;
  } catch (error) {
    console.error("Error in resetClientPassword:", error);
    toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
    return false;
  }
};
