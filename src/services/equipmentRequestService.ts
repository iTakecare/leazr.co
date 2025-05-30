
import { supabase } from "@/integrations/supabase/client";

export interface ClientEquipmentConfig {
  id: string;
  client_id: string;
  product_id: string;
  custom_monthly_price?: number;
  custom_price?: number;
  is_active: boolean;
  product?: {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    image_url?: string;
    monthly_price?: number;
    price: number;
    description?: string;
  };
}

export interface EquipmentRequest {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_company?: string;
  client_phone?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  additional_email?: string;
  comments?: string;
  total_monthly_amount: number;
  status: string;
  created_at: string;
  items?: EquipmentRequestItem[];
}

export interface EquipmentRequestItem {
  id: string;
  request_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_monthly_price: number;
  total_monthly_price: number;
}

export const getClientEquipmentConfigs = async (clientId: string): Promise<ClientEquipmentConfig[]> => {
  const { data, error } = await supabase
    .from('client_equipment_configs')
    .select(`
      *,
      product:products(*)
    `)
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client equipment configs:', error);
    throw error;
  }

  return data || [];
};

export const createEquipmentRequest = async (request: Omit<EquipmentRequest, 'id' | 'created_at' | 'status'>, items: Omit<EquipmentRequestItem, 'id' | 'request_id'>[]): Promise<string> => {
  const { data: requestData, error: requestError } = await supabase
    .from('equipment_requests')
    .insert([{
      ...request,
      status: 'pending'
    }])
    .select()
    .single();

  if (requestError) {
    console.error('Error creating equipment request:', requestError);
    throw requestError;
  }

  if (items.length > 0) {
    const requestItems = items.map(item => ({
      ...item,
      request_id: requestData.id
    }));

    const { error: itemsError } = await supabase
      .from('equipment_request_items')
      .insert(requestItems);

    if (itemsError) {
      console.error('Error creating equipment request items:', itemsError);
      throw itemsError;
    }
  }

  return requestData.id;
};

export const getClientRequests = async (clientId: string): Promise<EquipmentRequest[]> => {
  const { data, error } = await supabase
    .from('equipment_requests')
    .select(`
      *,
      items:equipment_request_items(*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client requests:', error);
    throw error;
  }

  return data || [];
};
