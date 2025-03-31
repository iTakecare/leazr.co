
import { supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData, Collaborator } from '@/types/client';
import { toast } from 'sonner';

export const clientService = {
  // Get all clients
  getAllClients: async (): Promise<Client[]> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as Client[];
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
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
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },
  
  // Verify VAT number using VIES API (via server endpoint)
  verifyVatNumber: async (vatNumber: string, country: string = 'BE'): Promise<{ valid: boolean; companyName?: string; address?: string; error?: string }> => {
    try {
      // Simulate API call for now - in a production app would call a server endpoint to verify with VIES
      console.log(`Verifying VAT number: ${vatNumber} from country: ${country}`);
      
      // Remove all spaces and special characters
      const sanitizedVatNumber = vatNumber.replace(/[^a-zA-Z0-9]/g, '');
      
      // Perform basic validation based on country
      let isValid = false;
      let companyName: string | undefined;
      let address: string | undefined;
      
      if (country === 'BE') {
        // Belgian VAT number format: 10 digits
        isValid = /^\d{10}$/.test(sanitizedVatNumber);
        if (isValid) {
          companyName = 'Company BE Example';
          address = '123 Sample Street, 1000 Brussels, Belgium';
        }
      } else if (country === 'FR') {
        // French SIREN (9 digits) or SIRET (14 digits)
        isValid = /^\d{9}$/.test(sanitizedVatNumber) || /^\d{14}$/.test(sanitizedVatNumber);
        if (isValid) {
          companyName = 'Entreprise Française Example';
          address = '45 Rue de Paris, 75001 Paris, France';
        }
      } else if (country === 'LU') {
        // Luxembourg VAT number format: 8 digits
        isValid = /^\d{8}$/.test(sanitizedVatNumber);
        if (isValid) {
          companyName = 'Luxembourg Company Example';
          address = '10 Avenue de la Liberté, 1930 Luxembourg';
        }
      }

      // In a real scenario, this would be an actual API call to VIES
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      if (isValid) {
        return {
          valid: true,
          companyName,
          address
        };
      } else {
        return {
          valid: false,
          error: `Format de ${country === 'BE' ? "numéro d'entreprise" : country === 'FR' ? "SIRET/SIREN" : "numéro d'identification"} invalide`
        };
      }
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
