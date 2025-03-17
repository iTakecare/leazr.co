
import { Ambassador } from '@/types/ambassador';

export interface CreateAmbassadorData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'lead';
}

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  // Simulate API call
  return [
    {
      id: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      company: 'Tech Solutions',
      phone: '+33 1 23 45 67 89',
      status: 'active',
      clients_count: 5,
      commissions_total: 2500,
      last_commission: 500,
      created_at: '2023-01-15T10:30:00Z',
      updated_at: '2023-06-10T15:45:00Z',
      has_user_account: true,
      user_account_created_at: '2023-01-16T09:20:00Z'
    },
    {
      id: '2',
      name: 'Marie Laurent',
      email: 'marie.laurent@example.com',
      company: 'Digital Marketing Pro',
      phone: '+33 6 12 34 56 78',
      status: 'active',
      clients_count: 3,
      commissions_total: 1200,
      last_commission: 350,
      created_at: '2023-02-20T11:15:00Z',
      updated_at: '2023-05-12T10:30:00Z'
    },
    {
      id: '3',
      name: 'Pierre Martin',
      email: 'pierre.martin@example.com',
      company: 'IT Consulting',
      status: 'inactive',
      clients_count: 1,
      commissions_total: 200,
      last_commission: 200,
      created_at: '2023-03-05T09:45:00Z',
      updated_at: '2023-04-10T14:20:00Z'
    }
  ];
};

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  const ambassadors = await getAmbassadors();
  return ambassadors.find(ambassador => ambassador.id === id) || null;
};

export const createAmbassador = async (data: CreateAmbassadorData): Promise<Ambassador | null> => {
  // Simulate API call
  const newAmbassador: Ambassador = {
    id: crypto.randomUUID(),
    name: data.name,
    email: data.email,
    company: data.company,
    phone: data.phone,
    notes: data.notes,
    status: data.status,
    clients_count: 0,
    commissions_total: 0,
    last_commission: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return newAmbassador;
};

export const updateAmbassador = async (id: string, data: Partial<CreateAmbassadorData>): Promise<Ambassador | null> => {
  // Simulate API call
  const ambassador = await getAmbassadorById(id);
  if (!ambassador) return null;
  
  const updatedAmbassador: Ambassador = {
    ...ambassador,
    ...data,
    updated_at: new Date().toISOString()
  };
  
  return updatedAmbassador;
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  // Simulate API call
  return true;
};

export { type Ambassador };
