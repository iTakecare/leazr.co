import { supabase } from "@/integrations/supabase/client";
import { CategorySpecificLink } from "@/types/categoryTypes";

export const getLinksByCategory = async (
  categoryId: string
): Promise<CategorySpecificLink[]> => {
  const { data, error } = await supabase
    .from("category_specific_links")
    .select(`
      *,
      parent_category:categories!parent_category_id(*),
      child_category:categories!child_category_id(*)
    `)
    .eq("parent_category_id", categoryId)
    .order("priority", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addSpecificLink = async (
  link: Omit<CategorySpecificLink, "id" | "created_at" | "updated_at" | "parent_category" | "child_category">
): Promise<CategorySpecificLink> => {
  const { data, error } = await supabase
    .from("category_specific_links")
    .insert(link)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSpecificLink = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("category_specific_links")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const getLinkedCategories = async (categoryId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("category_specific_links")
    .select("child_category_id")
    .eq("parent_category_id", categoryId);

  if (error) throw error;
  return data?.map((link) => link.child_category_id) || [];
};

export const updateSpecificLinkPriority = async (
  id: string,
  priority: number
): Promise<void> => {
  const { error } = await supabase
    .from("category_specific_links")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

export const getSpecificLinkDetails = async (categoryId: string): Promise<CategorySpecificLink[]> => {
  const { data, error } = await supabase
    .from("category_specific_links")
    .select(`
      *,
      parent_category:categories!parent_category_id(id, name, translation, type),
      child_category:categories!child_category_id(id, name, translation, type)
    `)
    .eq("parent_category_id", categoryId)
    .order("priority", { ascending: false });

  if (error) throw error;
  return data || [];
};
