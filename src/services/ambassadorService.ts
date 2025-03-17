export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  region?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'lead';
  user_id?: string;
  clients_count?: number;
  commissions_total?: number;
  last_commission?: number;
  created_at?: string;
  updated_at?: string;
  company?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const response = await fetch('/api/ambassadors');
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching ambassadors:', error);
    return [];
  }
};

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const response = await fetch(`/api/ambassadors/${id}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching ambassador:', error);
    return null;
  }
};

export const createAmbassador = async (data: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    const response = await fetch(`/api/ambassadors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating ambassador:', error);
    return null;
  }
};

export const updateAmbassador = async (id: string, data: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    const response = await fetch(`/api/ambassadors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating ambassador:', error);
    return null;
  }
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/ambassadors/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting ambassador:', error);
    return false;
  }
};
