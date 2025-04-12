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
