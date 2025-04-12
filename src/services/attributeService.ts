
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
    console.log("Creating new attribute:", attribute);
    const supabase = getSupabaseClient();
    
    // First check if an attribute with this name already exists
    const { data: existingAttribute, error: checkError } = await supabase
      .from('product_attributes')
      .select('*')
      .eq('name', attribute.name)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing attribute:", checkError);
    }
    
    if (existingAttribute) {
      console.log("Attribute with this name already exists:", existingAttribute);
      return existingAttribute;
    }
    
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

    console.log("Successfully created attribute:", data);
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
    
    // First check if the attribute exists
    const { data: existingAttribute, error: checkError } = await supabase
      .from('product_attributes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing attribute:", checkError);
      throw checkError;
    }
    
    if (!existingAttribute) {
      throw new Error(`Attribute with ID ${id} not found`);
    }
    
    const updateData: Partial<AttributeDefinition> = {};
    if (attribute.name !== undefined) updateData.name = attribute.name;
    if (attribute.display_name !== undefined) updateData.display_name = attribute.display_name;
    
    const { data, error } = await supabase
      .from('product_attributes')
      .update(updateData)
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
    
    // Delete the attribute values first
    const { error: valuesError } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('attribute_id', id);
    
    if (valuesError) {
      console.error(`Error deleting values for attribute with ID ${id}:`, valuesError);
      throw valuesError;
    }
    
    // Then delete the attribute itself
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
    console.log("Creating new attribute value:", attributeValue);
    const supabase = getSupabaseClient();
    
    // Check if a value with the same value already exists for this attribute
    const { data: existingValue, error: checkError } = await supabase
      .from('product_attribute_values')
      .select('*')
      .eq('attribute_id', attributeValue.attribute_id)
      .eq('value', attributeValue.value)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing attribute value:", checkError);
    }
    
    if (existingValue) {
      console.log("Attribute value already exists:", existingValue);
      return existingValue;
    }
    
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

    console.log("Successfully created attribute value:", data);
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
    
    const updateData: Partial<AttributeValue> = {};
    if (attributeValue.value !== undefined) updateData.value = attributeValue.value;
    if (attributeValue.display_value !== undefined) updateData.display_value = attributeValue.display_value;
    
    const { data, error } = await supabase
      .from('product_attribute_values')
      .update(updateData)
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
