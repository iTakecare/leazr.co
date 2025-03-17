
import { toast } from 'sonner';

interface OfferData {
  clientId: string | null;
  client_name: string;
  client_email: string;
  leaser_id: string;
  amount: number;
  coefficient: number;
  equipment_description: string;
  equipment_text: string;
  monthly_payment: number;
  commission: number;
  additional_info: string;
  user_id: string;
}

interface Offer extends OfferData {
  id: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const createOffer = async (data: OfferData): Promise<Offer | null> => {
  try {
    // In a real app, this would call your API to create the offer
    console.log('Creating offer with data:', data);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a simulated response
    const newOffer: Offer = {
      ...data,
      id: crypto.randomUUID(),
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return newOffer;
  } catch (error) {
    console.error('Error creating offer:', error);
    toast.error('Erreur lors de la création de l\'offre');
    return null;
  }
};

export const getOfferById = async (id: string): Promise<Offer | null> => {
  try {
    // In a real app, this would call your API to get the offer
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a simulated response
    const offer: Offer = {
      id,
      clientId: 'client-123',
      client_name: 'Acme Corporation',
      client_email: 'contact@acme.com',
      leaser_id: '1',
      amount: 10000,
      coefficient: 2.1,
      equipment_description: 'Équipement informatique',
      equipment_text: 'Détail de l\'équipement...',
      monthly_payment: 210,
      commission: 500,
      additional_info: '',
      user_id: 'user-123',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return offer;
  } catch (error) {
    console.error('Error fetching offer:', error);
    toast.error('Erreur lors de la récupération de l\'offre');
    return null;
  }
};
