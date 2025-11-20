import { supabase } from "@/integrations/supabase/client";

export interface CategoryType {
  id: string;
  value: string;
  label: string;
  icon?: string;
  bg_color: string;
  text_color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getCategoryTypes = async (): Promise<CategoryType[]> => {
  const { data, error } = await supabase
    .from("category_types")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getAllCategoryTypes = async (): Promise<CategoryType[]> => {
  const { data, error } = await supabase
    .from("category_types")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createCategoryType = async (
  type: Omit<CategoryType, "id" | "created_at" | "updated_at">
): Promise<CategoryType> => {
  const { data, error } = await supabase
    .from("category_types")
    .insert(type)
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
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCategoryTypeUsage = async (typeValue: string) => {
  const { count: categoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("type", typeValue);

  const { count: compatibilityCount } = await supabase
    .from("category_type_compatibilities")
    .select("id", { count: "exact", head: true })
    .or(`parent_type.eq.${typeValue},child_type.eq.${typeValue}`);

  return {
    categoryCount: categoryCount || 0,
    compatibilityCount: compatibilityCount || 0,
    isUsed: (categoryCount || 0) > 0 || (compatibilityCount || 0) > 0,
  };
};

export const deleteCategoryType = async (id: string, value: string): Promise<void> => {
  const usage = await getCategoryTypeUsage(value);

  if (usage.isUsed) {
    throw new Error(
      `Ce type est utilisé par ${usage.categoryCount} catégorie(s) et ${usage.compatibilityCount} compatibilité(s). Impossible de le supprimer.`
    );
  }

  const { error } = await supabase
    .from("category_types")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
};

export const reorderCategoryTypes = async (types: { id: string; display_order: number }[]) => {
  const promises = types.map(({ id, display_order }) =>
    supabase.from("category_types").update({ display_order }).eq("id", id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) throw errors[0].error;
};
