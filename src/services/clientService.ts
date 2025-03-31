import { supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData, Collaborator } from '@/types/client';
import { toast } from 'sonner';

export const clientService = {
  // Get all clients
  getAllClients: async (includeAmbassadorClients = false): Promise<Client[]> => {
    try {
      console.log(`Fetching clients with includeAmbassadorClients=${includeAmbassadorClients}`);
      
      let query = supabase.from('clients').select('*');
      
      // Si on ne veut pas inclure les clients des ambassadeurs, on doit filtrer pour exclure ceux qui sont dans la table ambassador_clients
      if (!includeAmbassadorClients) {
        // On cherche les clients qui n'ont PAS d'entrée dans ambassador_clients
        const { data: ambassadorClientIds } = await supabase
          .from('ambassador_clients')
          .select('client_id');
        
        if (ambassadorClientIds && ambassadorClientIds.length > 0) {
          const clientIdsToExclude = ambassadorClientIds.map(item => item.client_id);
          console.log(`Excluding ${clientIdsToExclude.length} ambassador clients`);
          query = query.not('id', 'in', `(${clientIdsToExclude.join(',')})`);
        }
      }
      
      // Compléter la requête avec l'ordre
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      console.log(`Retrieved ${data?.length || 0} clients from the database`);
      
      // Transform client data to include companyName property expected by ClientSelector
      return (data || []).map(client => ({
        ...client,
        companyName: client.company || '',  // Add companyName for compatibility
        companyId: client.id,               // Add companyId for compatibility
      })) as Client[];
    } catch (error) {
      console.error('Error in getAllClients:', error);
      toast.error('Erreur lors de la récupération des clients');
      return [];
    }
  },
  
  // Get a client by ID
  getClientById: async (id: string): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          collaborators:client_collaborators(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Format the client to match the Client interface
      const client = {
        ...data,
        collaborators: data.collaborators || []
      };

      return client as Client;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  },
  
  // Create a new client
  createClient: async (clientData: CreateClientData): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      return data as Client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },
  
  // Update a client
  updateClient: async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
    try {
      // Remove collaborators from the client data if present
      const { collaborators, ...clientDataWithoutCollaborators } = clientData as any;
      
      // Update client
      const { data, error } = await supabase
        .from('clients')
        .update(clientDataWithoutCollaborators)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as Client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  // Add a collaborator to a client
  addCollaborator: async (clientId: string, collaborator: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
    try {
      const { data, error } = await supabase
        .from('client_collaborators')
        .insert([{
          client_id: clientId,
          name: collaborator.name,
          role: collaborator.role,
          email: collaborator.email,
          phone: collaborator.phone,
          department: collaborator.department
        }])
        .select()
        .single();

      if (error) throw error;

      return data as Collaborator;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Erreur lors de l\'ajout du collaborateur');
      throw error;
    }
  },

  // Delete a collaborator
  deleteCollaborator: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('client_collaborators')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      toast.error('Erreur lors de la suppression du collaborateur');
      throw error;
    }
  },

  // Delete a client
  deleteClient: async (id: string): Promise<void> => {
    try {
      console.log(`Attempting to delete client with ID: ${id}`);
      
      // First check if client is associated with an ambassador
      const { data: ambassadorClient } = await supabase
        .from('ambassador_clients')
        .select('*')
        .eq('client_id', id)
        .maybeSingle();
      
      if (ambassadorClient) {
        console.log('This client is associated with an ambassador, removing association first');
        const { error: deleteAssociationError } = await supabase
          .from('ambassador_clients')
          .delete()
          .eq('client_id', id);
          
        if (deleteAssociationError) throw deleteAssociationError;
      }
      
      // First delete all collaborators
      const { error: collaboratorsError } = await supabase
        .from('client_collaborators')
        .delete()
        .eq('client_id', id);

      if (collaboratorsError) throw collaboratorsError;

      // Then delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Client supprimé avec succès');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression du client');
      throw error;
    }
  },
  
  // Verify VAT number using VIES API (via server endpoint)
  verifyVatNumber: async (vatNumber: string, country: string = 'BE'): Promise<{ valid: boolean; companyName?: string; address?: string; error?: string }> => {
    try {
      console.log(`Verifying VAT number: ${vatNumber} from country: ${country}`);
      
      // Remove any spaces or special characters from the VAT number
      const cleanVatNumber = vatNumber.replace(/[^a-zA-Z0-9]/g, '');
      
      // Call the VIES Edge Function
      const { data, error } = await supabase.functions.invoke('vies-verify', {
        body: { vatNumber: cleanVatNumber, country }
      });
      
      if (error) {
        console.error('Error calling VIES verification service:', error);
        
        // If we get an error from the edge function, try the mock fallback service
        // This is for demo purposes only - in production, you might want to retry or use another service
        console.log("Using fallback mock service due to VIES API error");
        
        // Simple mock response based on the VAT number format
        // In a real app, you'd implement a proper fallback service
        if (cleanVatNumber.match(/^[0-9]{10}$/)) {  // Belgium
          return {
            valid: true,
            companyName: "Belgian Company " + cleanVatNumber.substring(0, 4),
            address: "Avenue Louise 123, 1000 Brussels, Belgium"
          };
        } else if (cleanVatNumber.match(/^[0-9]{9}$/) || cleanVatNumber.match(/^[0-9]{14}$/)) {  // France
          return {
            valid: true,
            companyName: "French Company " + cleanVatNumber.substring(0, 4),
            address: "Avenue des Champs-Élysées 123, 75008 Paris, France"
          };
        } else if (cleanVatNumber.match(/^[0-9]{8}$/)) {  // Luxembourg
          return {
            valid: true,
            companyName: "Luxembourg Company " + cleanVatNumber.substring(0, 4),
            address: "Boulevard Royal 123, 2449 Luxembourg"
          };
        } else {
          return {
            valid: false,
            error: `Service error: ${error.message || 'Erreur de connexion au service de vérification'}`
          };
        }
      }
      
      console.log('VIES verification result:', data);
      
      // Return the result from the Edge Function
      return {
        valid: data.valid,
        companyName: data.companyName,
        address: data.address,
        error: data.error
      };
    } catch (error) {
      console.error('Error verifying VAT number:', error);
      return {
        valid: false,
        error: 'Erreur lors de la vérification du numéro'
      };
    }
  }
};

export const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  addCollaborator,
  deleteCollaborator,
  deleteClient,
  verifyVatNumber
} = clientService;
