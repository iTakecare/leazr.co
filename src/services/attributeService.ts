
import { getSupabaseClient } from "@/integrations/supabase/client";
import { AttributeDefinition, AttributeValue } from "@/types/catalog";

// Fetch all attribute definitions
export async function getAttributes(): Promise<AttributeDefinition[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('product_attributes')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching attributes:", error);
      throw new Error(`API Error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAttributes:", error);
    return [];
  }
}

// Fetch a single attribute definition with its values
export async function getAttributeWithValues(attributeId: string): Promise<AttributeDefinition | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Get the attribute
    const { data: attribute, error } = await supabase
      .from('product_attributes')
      .select('*')
      .eq('id', attributeId)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching attribute with ID ${attributeId}:`, error);
      throw error;
    }
    
    if (!attribute) {
      return null;
    }
    
    // Get the attribute values
    const { data: values, error: valuesError } = await supabase
      .from('product_attribute_values')
      .select('*')
      .eq('attribute_id', attributeId)
      .order('value', { ascending: true });

    if (valuesError) {
      console.error(`Error fetching values for attribute ${attributeId}:`, valuesError);
      throw valuesError;
    }
    
    return {
      ...attribute,
      values: values || []
    };
  } catch (error) {
    console.error("Error in getAttributeWithValues:", error);
    throw error;
  }
}

// Create a new attribute definition
export async function createAttribute(attribute: Omit<AttributeDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<AttributeDefinition> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_attributes')
      .insert([{ 
        name: attribute.name,
        display_name: attribute.display_name
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating attribute:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createAttribute:", error);
    throw error;
  }
}

// Update an attribute definition
export async function updateAttribute(id: string, attribute: Partial<AttributeDefinition>): Promise<AttributeDefinition> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_attributes')
      .update({ 
        name: attribute.name,
        display_name: attribute.display_name
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating attribute with ID ${id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateAttribute:", error);
    throw error;
  }
}

// Delete an attribute definition
export async function deleteAttribute(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('product_attributes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting attribute with ID ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteAttribute:", error);
    throw error;
  }
}

// Create a new attribute value
export async function createAttributeValue(attributeValue: Omit<AttributeValue, 'id' | 'created_at' | 'updated_at'>): Promise<AttributeValue> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_attribute_values')
      .insert([{ 
        attribute_id: attributeValue.attribute_id,
        value: attributeValue.value,
        display_value: attributeValue.display_value
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating attribute value:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createAttributeValue:", error);
    throw error;
  }
}

// Update an attribute value
export async function updateAttributeValue(id: string, attributeValue: Partial<AttributeValue>): Promise<AttributeValue> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_attribute_values')
      .update({ 
        value: attributeValue.value,
        display_value: attributeValue.display_value
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating attribute value with ID ${id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateAttributeValue:", error);
    throw error;
  }
}

// Delete an attribute value
export async function deleteAttributeValue(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting attribute value with ID ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteAttributeValue:", error);
    throw error;
  }
}
