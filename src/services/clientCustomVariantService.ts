import { supabase } from "@/integrations/supabase/client";

export interface ClientCustomVariant {
  id: string;
  client_id: string;
  product_id: string;
  variant_name: string;
  attributes: Record<string, string>;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientCustomVariantData {
  client_id: string;
  product_id: string;
  variant_name: string;
  attributes: Record<string, string>;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
}

export interface UpdateClientCustomVariantData {
  variant_name?: string;
  attributes?: Record<string, string>;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
}

// Get all custom variants for a specific client and product
export const getClientCustomVariants = async (clientId: string, productId: string) => {
  const { data, error } = await supabase
    .from('client_custom_variants')
    .select('*')
    .eq('client_id', clientId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client custom variants:', error);
    throw error;
  }

  return data as ClientCustomVariant[];
};

// Create a new custom variant for a client
export const createClientCustomVariant = async (variantData: CreateClientCustomVariantData) => {
  // Get the user's company ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.company_id) {
    throw new Error('Company ID not found');
  }

  const { data, error } = await supabase
    .from('client_custom_variants')
    .insert({
      ...variantData,
      company_id: profile.company_id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client custom variant:', error);
    throw error;
  }

  return data as ClientCustomVariant;
};

// Update an existing custom variant
export const updateClientCustomVariant = async (
  variantId: string, 
  updates: UpdateClientCustomVariantData
) => {
  const { data, error } = await supabase
    .from('client_custom_variants')
    .update(updates)
    .eq('id', variantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client custom variant:', error);
    throw error;
  }

  return data as ClientCustomVariant;
};

// Delete a custom variant
export const deleteClientCustomVariant = async (variantId: string) => {
  const { error } = await supabase
    .from('client_custom_variants')
    .delete()
    .eq('id', variantId);

  if (error) {
    console.error('Error deleting client custom variant:', error);
    throw error;
  }
};

// Get custom variant by ID
export const getClientCustomVariantById = async (variantId: string) => {
  const { data, error } = await supabase
    .from('client_custom_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (error) {
    console.error('Error fetching client custom variant:', error);
    throw error;
  }

  return data as ClientCustomVariant;
};