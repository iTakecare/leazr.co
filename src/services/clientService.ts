
import { supabase } from "@/integrations/supabase/client";
import { Client, CreateClientData, Collaborator } from "@/types/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Données mockées pour avoir un affichage immédiat en cas de timeout
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

// Helper pour convertir les dates
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
    // Réduire le timeout à 5 secondes pour ne pas bloquer l'interface utilisateur
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
    
    // Utiliser Promise.race pour résoudre avec la première promesse qui se termine
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) throw error;
    
    // Si aucune donnée n'est récupérée, renvoyer un tableau vide plutôt que null
    return data ? data.map(mapDbClientToClient) : [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    // En cas d'erreur ou de timeout, retourner les données mockées
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
    // Trouver dans les données mockées
    const mockClient = mockClients.find(c => c.id === id);
    return mockClient ? mapDbClientToClient(mockClient) : null;
  }
};

export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vous devez être connecté pour créer un client");
      return null;
    }
    
    // Ajouter l'ID de l'utilisateur aux données du client
    const clientWithUserId = {
      ...clientData,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clientWithUserId)
      .select()
      .single();
    
    if (error) throw error;
    
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

// Service pour vérifier un numéro de TVA via un mock de l'API VIES
export const verifyVatNumber = async (vatNumber: string): Promise<{ valid: boolean, companyName?: string, address?: string }> => {
  // Simulation d'un appel API avec un délai
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Pour la démo, on considère que BE0123456789 est valide
  if (vatNumber === "BE0123456789") {
    return {
      valid: true,
      companyName: "ACME BELGIUM SA",
      address: "Rue de la Loi 1, 1000 Bruxelles, Belgique"
    };
  }
  
  // Les autres numéros sont considérés comme invalides
  return { valid: false };
};

// Service pour gérer les collaborateurs
export const addCollaborator = async (clientId: string, collaborator: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
  try {
    // Récupérer le client actuel pour obtenir ses collaborateurs
    const client = await getClientById(clientId);
    if (!client) {
      toast.error("Client introuvable");
      return null;
    }
    
    // Créer un nouvel ID pour le collaborateur
    const newCollaborator: Collaborator = {
      ...collaborator,
      id: crypto.randomUUID()
    };
    
    // Ajouter le collaborateur à la liste existante
    const updatedCollaborators = [...(client.collaborators || []), newCollaborator];
    
    // Mettre à jour le client
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
    // Récupérer le client actuel pour obtenir ses collaborateurs
    const client = await getClientById(clientId);
    if (!client || !client.collaborators) {
      toast.error("Client ou collaborateurs introuvables");
      return false;
    }
    
    // Filtrer pour retirer le collaborateur
    const updatedCollaborators = client.collaborators.filter(c => c.id !== collaboratorId);
    
    // Mettre à jour le client
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
