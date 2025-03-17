
import { Ambassador, DetailAmbassador, CreateAmbassadorData } from '@/types/ambassador';
import { v4 as uuidv4 } from 'uuid';
import { CreateClientData } from '@/types/client';

// Mock data for ambassadors
const mockAmbassadors: Ambassador[] = [
  {
    id: '1',
    name: 'Sophie Laurent',
    email: 'sophie.laurent@example.com',
    phone: '+33 6 12 34 56 78',
    region: 'Île-de-France',
    status: 'active',
    clients_count: 12,
    commissions_total: 4500,
    last_commission: 750,
    notes: 'Ambassadrice très active dans le milieu hospitalier parisien.',
    created_at: '2023-01-15T09:30:00Z',
    updated_at: '2023-06-20T14:45:00Z',
    has_user_account: true,
    user_account_created_at: '2023-01-16T10:15:00Z'
  },
  {
    id: '2',
    name: 'Marc Dubois',
    email: 'marc.dubois@example.com',
    phone: '+33 6 23 45 67 89',
    region: 'Auvergne-Rhône-Alpes',
    status: 'active',
    clients_count: 8,
    commissions_total: 3200,
    last_commission: 550,
    notes: 'Bonne connaissance du réseau de cliniques privées de Lyon.',
    created_at: '2023-02-10T11:20:00Z',
    updated_at: '2023-07-05T16:30:00Z',
    has_user_account: true,
    user_account_created_at: '2023-02-11T09:45:00Z'
  },
  {
    id: '3',
    name: 'Émilie Moreau',
    email: 'emilie.moreau@example.com',
    phone: '+33 6 34 56 78 90',
    region: 'Provence-Alpes-Côte d\'Azur',
    status: 'inactive',
    clients_count: 5,
    commissions_total: 1800,
    last_commission: 0,
    notes: 'En pause temporaire pour congé maternité.',
    created_at: '2023-03-05T10:15:00Z',
    updated_at: '2023-06-15T09:20:00Z',
    has_user_account: false
  }
];

// Get all ambassadors
export const getAmbassadors = async (): Promise<Ambassador[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockAmbassadors);
    }, 800);
  });
};

// Get ambassador by ID
export const getAmbassadorById = async (id: string): Promise<DetailAmbassador> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const ambassador = mockAmbassadors.find(a => a.id === id);
      if (ambassador) {
        // Create a DetailAmbassador with the base Ambassador data
        const detailAmbassador: DetailAmbassador = {
          ...ambassador,
          clients: [],
          commissions: [],
          collaborators: []
        };
        resolve(detailAmbassador);
      } else {
        reject(new Error(`Ambassador with ID ${id} not found`));
      }
    }, 800);
  });
};

// Get ambassador profile
export const getAmbassadorProfile = async (userId: string): Promise<Ambassador | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulating looking up an ambassador by user ID
      const ambassador = mockAmbassadors.find(a => a.id === '1'); // For demo, just return first ambassador
      resolve(ambassador || null);
    }, 800);
  });
};

// Create a new ambassador
export const createAmbassador = async (ambassadorData: CreateAmbassadorData): Promise<Ambassador> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newAmbassador: Ambassador = {
        id: uuidv4(),
        ...ambassadorData,
        clients_count: 0,
        commissions_total: 0,
        last_commission: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // In a real app, this would save to a database
      mockAmbassadors.push(newAmbassador);
      
      resolve(newAmbassador);
    }, 800);
  });
};

// Update ambassador
export const updateAmbassador = async (id: string, ambassadorData: Partial<CreateAmbassadorData>): Promise<Ambassador> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockAmbassadors.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAmbassadors[index] = {
          ...mockAmbassadors[index],
          ...ambassadorData,
          updated_at: new Date().toISOString()
        };
        resolve(mockAmbassadors[index]);
      } else {
        reject(new Error(`Ambassador with ID ${id} not found`));
      }
    }, 800);
  });
};

// Create client for ambassador
export const createClientForAmbassador = async (ambassadorId: string, clientData: CreateClientData): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const ambassador = mockAmbassadors.find(a => a.id === ambassadorId);
      if (ambassador) {
        // In a real app, this would create a client in the database
        const newClient = {
          id: uuidv4(),
          ...clientData,
          ambassador_id: ambassadorId,
          created_at: new Date().toISOString()
        };
        
        // Update ambassador stats
        ambassador.clients_count += 1;
        
        resolve(true);
      } else {
        reject(new Error(`Ambassador with ID ${ambassadorId} not found`));
      }
    }, 800);
  });
};

// Export Ambassador type
export type { Ambassador, DetailAmbassador, CreateAmbassadorData };
