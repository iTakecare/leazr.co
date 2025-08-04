import { supabase } from "@/integrations/supabase/client";

export interface ClientCustomVariantCombination {
  id: string;
  client_id: string;
  product_id: string;
  attributes: Record<string, string>;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientCustomVariantCombinationData {
  client_id: string;
  product_id: string;
  attributes: Record<string, string>;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
  is_available?: boolean;
}

export interface UpdateClientCustomVariantCombinationData {
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
  is_available?: boolean;
}

// Get all custom variant combinations for a client and product
export const getClientCustomVariantCombinations = async (
  clientId: string,
  productId: string
): Promise<ClientCustomVariantCombination[]> => {
  const { data, error } = await supabase
    .from('client_custom_variant_combinations')
    .select('*')
    .eq('client_id', clientId)
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching client custom variant combinations:', error);
    throw error;
  }

  return data || [];
};

// Create a new client custom variant combination
export const createClientCustomVariantCombination = async (
  combinationData: CreateClientCustomVariantCombinationData
): Promise<ClientCustomVariantCombination> => {
  const { data, error } = await supabase
    .from('client_custom_variant_combinations')
    .insert([combinationData])
    .select()
    .single();

  if (error) {
    console.error('Error creating client custom variant combination:', error);
    throw error;
  }

  return data;
};

// Update an existing client custom variant combination
export const updateClientCustomVariantCombination = async (
  id: string,
  updates: UpdateClientCustomVariantCombinationData
): Promise<ClientCustomVariantCombination> => {
  const { data, error } = await supabase
    .from('client_custom_variant_combinations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client custom variant combination:', error);
    throw error;
  }

  return data;
};

// Delete a client custom variant combination
export const deleteClientCustomVariantCombination = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('client_custom_variant_combinations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client custom variant combination:', error);
    throw error;
  }
};

// Generate all possible combinations based on product attributes and custom variants
export const generateAllCombinations = (
  productAttributes: Record<string, string[]>,
  customVariantAttributes: Record<string, string[]>
): Record<string, string>[] => {
  // Merge product attributes with custom variant attributes
  const allAttributes = { ...productAttributes, ...customVariantAttributes };
  
  const attributeKeys = Object.keys(allAttributes);
  if (attributeKeys.length === 0) return [];

  // Generate all possible combinations
  const combinations: Record<string, string>[] = [];
  
  function generateCombinations(index: number, currentCombination: Record<string, string>) {
    if (index === attributeKeys.length) {
      combinations.push({ ...currentCombination });
      return;
    }

    const currentAttribute = attributeKeys[index];
    const possibleValues = allAttributes[currentAttribute];

    for (const value of possibleValues) {
      currentCombination[currentAttribute] = value;
      generateCombinations(index + 1, currentCombination);
    }
  }

  generateCombinations(0, {});
  return combinations;
};

// Bulk create combinations
export const createAllCombinations = async (
  clientId: string,
  productId: string,
  combinations: Record<string, string>[]
): Promise<ClientCustomVariantCombination[]> => {
  const combinationData = combinations.map(attributes => ({
    client_id: clientId,
    product_id: productId,
    attributes,
    is_available: true
  }));

  const { data, error } = await supabase
    .from('client_custom_variant_combinations')
    .upsert(combinationData, {
      onConflict: 'client_id,product_id,attributes',
      ignoreDuplicates: true
    })
    .select();

  if (error) {
    console.error('Error creating all combinations:', error);
    throw error;
  }

  return data || [];
};

// Find a specific combination based on selected options
export const findClientCustomVariantCombination = async (
  clientId: string,
  productId: string,
  selectedOptions: Record<string, string>
): Promise<ClientCustomVariantCombination | null> => {
  try {
    // Get all combinations for this client/product and filter locally
    const combinations = await getClientCustomVariantCombinations(clientId, productId);
    
    // Find matching combination by comparing attributes
    const matchingCombination = combinations.find(combination => {
      if (!combination.is_available) return false;
      
      // Deep compare the attributes objects
      const combinationAttrs = combination.attributes as Record<string, string>;
      const selectedAttrs = selectedOptions;
      
      // Convert both to normalized JSON strings for comparison
      const normalizeForComparison = (obj: Record<string, string>) => {
        const sorted = Object.keys(obj)
          .sort()
          .reduce((result, key) => {
            result[key] = obj[key];
            return result;
          }, {} as Record<string, string>);
        return JSON.stringify(sorted);
      };
      
      return normalizeForComparison(combinationAttrs) === normalizeForComparison(selectedAttrs);
    });
    
    return matchingCombination || null;
  } catch (error) {
    console.error('Error finding client custom variant combination:', error);
    return null;
  }
};