import { supabase } from "@/integrations/supabase/client";
import { CategoryType } from "@/types/categoryTypes";

export const getCategoryTypes = async (): Promise<CategoryType[]> => {
  const { data, error } = await supabase
    .from("category_types")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getCategoryTypeById = async (id: string): Promise<CategoryType | null> => {
  const { data, error } = await supabase
    .from("category_types")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const addCategoryType = async (
  categoryType: Omit<CategoryType, "id" | "created_at" | "updated_at">
): Promise<CategoryType> => {
  const { data, error } = await supabase
    .from("category_types")
    .insert(categoryType)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategoryType = async (
  id: string,
  updates: Partial<Omit<CategoryType, "id" | "created_at" | "updated_at">>
): Promise<CategoryType> => {
  const { data, error } = await supabase
    .from("category_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategoryType = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("category_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
