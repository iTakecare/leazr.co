import { supabase } from "@/integrations/supabase/client";
import { CategoryCompatibility } from "@/types/categoryTypes";

export const getCompatibilitiesByType = async (
  typeId: string
): Promise<CategoryCompatibility[]> => {
  const { data, error } = await supabase
    .from("category_compatibilities")
    .select(`
      *,
      parent_type:category_types!parent_category_type_id(*),
      child_type:category_types!child_category_type_id(*)
    `)
    .or(`parent_category_type_id.eq.${typeId},child_category_type_id.eq.${typeId}`);

  if (error) throw error;
  return data || [];
};

export const getAllCompatibilities = async (): Promise<CategoryCompatibility[]> => {
  const { data, error } = await supabase
    .from("category_compatibilities")
    .select(`
      *,
      parent_type:category_types!parent_category_type_id(*),
      child_type:category_types!child_category_type_id(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addCompatibility = async (
  compatibility: Omit<CategoryCompatibility, "id" | "created_at" | "updated_at" | "parent_type" | "child_type">
): Promise<CategoryCompatibility> => {
  const { data, error } = await supabase
    .from("category_compatibilities")
    .insert(compatibility)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCompatibility = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("category_compatibilities")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const getCompatibleTypes = async (typeId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("category_compatibilities")
    .select("child_category_type_id")
    .eq("parent_category_type_id", typeId);

  if (error) throw error;
  return data?.map((c) => c.child_category_type_id) || [];
};
