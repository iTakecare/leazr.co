
import { v4 as uuidv4 } from 'uuid';

// Mock offer data and service functions
export interface Offer {
  id: string;
  clientId: string;
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
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'signed';
  created_at: string;
  updated_at: string;
}

// Mock offers data store
const mockOffers: Offer[] = [];

// Create a new offer
export const createOffer = async (offerData: Omit<Offer, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<Offer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newOffer: Offer = {
        id: uuidv4(),
        ...offerData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockOffers.push(newOffer);
      console.log('Created offer:', newOffer);
      
      resolve(newOffer);
    }, 1000);
  });
};

// Get all offers
export const getOffers = async (): Promise<Offer[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockOffers);
    }, 800);
  });
};

// Get offer by ID
export const getOfferById = async (id: string): Promise<Offer | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const offer = mockOffers.find(o => o.id === id) || null;
      resolve(offer);
    }, 500);
  });
};

// Update offer status
export const updateOfferStatus = async (id: string, status: Offer['status']): Promise<Offer | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const offerIndex = mockOffers.findIndex(o => o.id === id);
      if (offerIndex !== -1) {
        mockOffers[offerIndex] = {
          ...mockOffers[offerIndex],
          status,
          updated_at: new Date().toISOString()
        };
        resolve(mockOffers[offerIndex]);
      } else {
        resolve(null);
      }
    }, 500);
  });
};

// Delete offer
export const deleteOffer = async (id: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const offerIndex = mockOffers.findIndex(o => o.id === id);
      if (offerIndex !== -1) {
        mockOffers.splice(offerIndex, 1);
        resolve(true);
      } else {
        resolve(false);
      }
    }, 500);
  });
};

// Send information request
export const sendInfoRequest = async (offerId: string, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Sending info request for offer ${offerId}: ${message}`);
      resolve(true);
    }, 800);
  });
};

// Process information response
export const processInfoResponse = async (offerId: string, response: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Processing info response for offer ${offerId}: ${response}`);
      resolve(true);
    }, 800);
  });
};

// Get workflow logs
export const getWorkflowLogs = async (offerId: string): Promise<any[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock some workflow logs
      resolve([
        {
          id: uuidv4(),
          offer_id: offerId,
          action: 'create',
          user: 'System',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Offer created'
        },
        {
          id: uuidv4(),
          offer_id: offerId,
          action: 'status_change',
          user: 'John Doe',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          details: 'Status changed from draft to sent'
        }
      ]);
    }, 600);
  });
};
