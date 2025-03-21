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
    
    // Get user profile to check if user is an ambassador
    const userProfile = await supabase.auth.getUser();
    
    let isAmbassador = false;
    let ambassadorId = null;
    
    console.log("User profile:", userProfile);
    
    // Check in user_metadata for role or ambassador_id
    if (userProfile?.data?.user?.user_metadata?.role === 'ambassador' || 
        userProfile?.data?.user?.user_metadata?.ambassador_id) {
      isAmbassador = true;
      ambassadorId = userProfile?.data?.user?.user_metadata?.ambassador_id;
      console.log("Ambassador identified from metadata:", { isAmbassador, ambassadorId });
    }
    
    // If ambassador_id not found in metadata, check user object directly
    if (!ambassadorId && userProfile?.data?.user?.ambassador_id) {
      ambassadorId = userProfile?.data?.user?.ambassador_id;
      isAmbassador = true;
      console.log("Ambassador identified from user object:", { isAmbassador, ambassadorId });
    }
    
    // Finally, check directly in the ambassadors table
    if (!ambassadorId) {
      const { data: ambData, error: ambError } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', userProfile?.data?.user?.id)
        .single();
      
      if (!ambError && ambData) {
        ambassadorId = ambData.id;
        isAmbassador = true;
        console.log("Ambassador identified from ambassadors table:", { isAmbassador, ambassadorId });
      } else if (ambError && ambError.code !== 'PGRST116') { // PGRST116 is 'not found' error
        console.error("Error checking ambassador:", ambError);
      }
    }
    
    // If this is an ambassador creating a client, create the association
    if (isAmbassador && ambassadorId && data.id) {
      try {
        console.log("Creating association between ambassador and client:", {
          ambassadorId,
          clientId: data.id
        });
        
        // First remove any existing associations for this client
        const { error: deleteError } = await supabase
          .from('ambassador_clients')
          .delete()
          .eq('client_id', data.id);
        
        if (deleteError) {
          console.error("Error removing old associations:", deleteError);
        }
        
        // Then create the new association
        const { data: assocData, error: assocError } = await supabase
          .from('ambassador_clients')
          .insert({
            ambassador_id: ambassadorId,
            client_id: data.id
          })
          .select();
        
        if (assocError) {
          console.error("Error creating ambassador-client association:", assocError);
          toast.error("Error associating client with ambassador");
        } else {
          console.log("Successfully created ambassador-client association:", assocData);
          toast.success("Client created and associated with your ambassador account");
        }
      } catch (associationError) {
        console.error("Exception creating ambassador-client association:", associationError);
        toast.error("Error associating client with ambassador");
      }
    } else {
      if (isAmbassador) {
        console.error("Could not associate client: Ambassador ID not found", { isAmbassador, ambassadorId });
        toast.error("Could not associate client - ambassador ID not found");
      } else {
        console.log("Client created by non-ambassador user");
      }
    }
    
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

export const linkClientToAmbassador = async (clientId: string, ambassadorId: string): Promise<boolean> => {
  try {
    if (!clientId || !ambassadorId) {
      console.error("Missing required parameters for linkClientToAmbassador", { clientId, ambassadorId });
      return false;
    }
    
    console.log("Linking client to ambassador:", {
      ambassadorId,
      clientId
    });
    
    // First verify client exists
    const { data: clientExists, error: clientError } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("id", clientId)
      .single();
    
    if (clientError || !clientExists) {
      console.error("Error verifying client existence:", clientError);
      toast.error(`Client with ID ${clientId} not found`);
      return false;
    }
    
    console.log("Client verified:", clientExists);
    
    // Verify ambassador exists
    const { data: ambassadorExists, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id, name, email")
      .eq("id", ambassadorId)
      .single();
    
    if (ambassadorError || !ambassadorExists) {
      console.error("Error verifying ambassador existence:", ambassadorError);
      toast.error(`Ambassador with ID ${ambassadorId} not found`);
      return false;
    }
    
    console.log("Ambassador verified:", ambassadorExists);
    
    // Remove any existing associations for this client
    const { error: deleteError } = await supabase
      .from("ambassador_clients")
      .delete()
      .eq("client_id", clientId);
      
    if (deleteError) {
      console.error("Error removing old links:", deleteError);
    }
    
    // Create new association
    const { data, error: insertError } = await supabase
      .from("ambassador_clients")
      .insert({
        ambassador_id: ambassadorId,
        client_id: clientId
      })
      .select();
      
    if (insertError) {
      console.error("Error linking client to ambassador:", insertError);
      toast.error("Error linking client to ambassador");
      return false;
    }
    
    console.log("Client successfully linked to ambassador, result:", data);
    return true;
  } catch (error) {
    console.error("Exception when linking client to ambassador:", error);
    toast.error("Error linking client to ambassador");
    return false;
  }
};

export { createUserAccount as createAccountForClient, resetPassword as resetClientPassword };
