
import { supabase } from "@/integrations/supabase/client";
import { AttributeDefinition, AttributeValue } from "@/types/catalog";

export const getAttributeDefinitions = async (): Promise<AttributeDefinition[]> => {
  try {
    const { data, error } = await supabase
      .from('attribute_definitions')
      .select('*');

    if (error) {
      console.error("Error fetching attribute definitions:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAttributeDefinitions:", error);
    throw error;
  }
};

export const getAttributeValuesForDefinition = async (attributeDefinitionId: string): Promise<AttributeValue[]> => {
  try {
    const { data, error } = await supabase
      .from('attribute_values')
      .select('*')
      .eq('attribute_definition_id', attributeDefinitionId);

    if (error) {
      console.error("Error fetching attribute values:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAttributeValuesForDefinition:", error);
    throw error;
  }
};

// New functions to be added

export const getAttributes = async (): Promise<AttributeDefinition[]> => {
  return getAttributeDefinitions();
};

export const getAttributeWithValues = async (id: string): Promise<{
  id: string;
  name: string;
  display_name: string;
  values?: AttributeValue[];
}> => {
  try {
    // First get the attribute definition
    const { data: attribute, error: attrError } = await supabase
      .from('product_attributes')
      .select('*')
      .eq('id', id)
      .single();

    if (attrError) throw attrError;

    // Then get its values
    const { data: values, error: valuesError } = await supabase
      .from('product_attribute_values')
      .select('*')
      .eq('attribute_id', id);

    if (valuesError) throw valuesError;

    return {
      ...attribute,
      values: values || []
    };
  } catch (error) {
    console.error("Error getting attribute with values:", error);
    throw error;
  }
};

export const createAttribute = async (attribute: {
  name: string;
  display_name: string;
}): Promise<AttributeDefinition> => {
  try {
    const { data, error } = await supabase
      .from('product_attributes')
      .insert([attribute])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating attribute:", error);
    throw error;
  }
};

export const updateAttribute = async (
  id: string,
  attribute: Partial<AttributeDefinition>
): Promise<AttributeDefinition> => {
  try {
    const { data, error } = await supabase
      .from('product_attributes')
      .update(attribute)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating attribute:", error);
    throw error;
  }
};

export const deleteAttribute = async (id: string): Promise<void> => {
  try {
    // First delete all values associated with this attribute
    const { error: valuesError } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('attribute_id', id);

    if (valuesError) throw valuesError;

    // Then delete the attribute itself
    const { error } = await supabase
      .from('product_attributes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting attribute:", error);
    throw error;
  }
};

export const createAttributeValue = async (value: {
  attribute_id: string;
  value: string;
  display_value: string;
}): Promise<AttributeValue> => {
  try {
    const { data, error } = await supabase
      .from('product_attribute_values')
      .insert([value])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating attribute value:", error);
    throw error;
  }
};

export const updateAttributeValue = async (
  id: string,
  value: Partial<AttributeValue>
): Promise<AttributeValue> => {
  try {
    const { data, error } = await supabase
      .from('product_attribute_values')
      .update(value)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating attribute value:", error);
    throw error;
  }
};

export const deleteAttributeValue = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting attribute value:", error);
    throw error;
  }
};
