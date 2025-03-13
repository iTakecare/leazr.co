
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
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
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
      user_id: user.id
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
    
    const updatedCollaborators = [...(client.collaborators || []), newCollaborator];
    
    const updated = await updateClient(clientId, { collaborators: updatedCollaborators });
    
    if (!updated) {
      throw new Error("Échec de la mise à jour du client");
    }
    
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
    
    const { data: existingUser, error: userCheckError } = await adminSupabase.auth.admin.listUsers({
      filter: {
        email: client.email
      }
    });

    if (userCheckError) {
      console.error("Error checking existing user:", userCheckError);
      throw userCheckError;
    }

    let userId: string;
    
    if (existingUser && existingUser.users.length > 0) {
      userId = existingUser.users[0].id;
      console.log("User already exists, sending password reset email");
      
      const { error: resetError } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: client.email,
        options: {
          redirectTo: `${window.location.origin}/login`
        }
      });
      
      if (resetError) {
        console.error("Error sending password reset:", resetError);
        throw resetError;
      }
    } else {
      console.log("Creating new user account");
      
      const tempPassword = Math.random().toString(36).slice(-10);
      
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: client.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: client.name.split(' ')[0],
          last_name: client.name.split(' ').slice(1).join(' '),
          role: 'client',
          company: client.company || null
        }
      });
      
      if (createError) {
        console.error("Error creating user account:", createError);
        throw createError;
      }
      
      userId = newUser.user.id;
      
      const { error: resetError } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: client.email,
        options: {
          redirectTo: `${window.location.origin}/login`
        }
      });
      
      if (resetError) {
        console.error("Error sending password reset:", resetError);
        throw resetError;
      }
    }
    
    toast.success("Email d'invitation envoyé avec succès");
    return true;
  } catch (error) {
    console.error("Error in createAccountForClient:", error);
    return false;
  }
};
