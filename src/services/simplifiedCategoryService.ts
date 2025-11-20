import { supabase } from "@/integrations/supabase/client";

export interface SimplifiedCategory {
  id: string;
  name: string;
  translation: string;
  type: string;
  description?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface CategoryTypeCompatibility {
  id: string;
  parent_type: string;
  child_type: string;
  created_at?: string;
  updated_at?: string;
}

// Types disponibles
export const CATEGORY_TYPES = [
  { value: 'device', label: 'Appareil' },
  { value: 'accessory', label: 'Accessoire' },
  { value: 'peripheral', label: 'Périphérique' },
  { value: 'software', label: 'Logiciel' },
  { value: 'service', label: 'Service' },
  { value: 'consumable', label: 'Consommable' },
] as const;

// Récupérer toutes les catégories avec comptage produits
export const getCategoriesWithProductCount = async (): Promise<SimplifiedCategory[]> => {
  const { data, error } = await supabase
    .from("categories_with_product_count")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
};

// Récupérer une catégorie par ID
export const getCategoryById = async (id: string): Promise<SimplifiedCategory | null> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

// Créer une catégorie
export const createCategory = async (
  category: Omit<SimplifiedCategory, "id" | "created_at" | "updated_at" | "product_count">
): Promise<SimplifiedCategory> => {
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mettre à jour une catégorie
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<SimplifiedCategory, "id" | "created_at" | "updated_at" | "company_id" | "product_count">>
): Promise<SimplifiedCategory> => {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Supprimer une catégorie
export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// Récupérer les produits d'une catégorie
export const getCategoryProducts = async (
  categoryId: string, 
  options?: { 
    limit?: number;
    offset?: number;
    searchTerm?: string;
    includeInactive?: boolean;
  }
) => {
  let query = supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId);

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  if (options?.searchTerm) {
    query = query.or(`name.ilike.%${options.searchTerm}%,brand_name.ilike.%${options.searchTerm}%`);
  }

  query = query.order('name', { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getCategoryStats = async (categoryId: string) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('purchase_price, monthly_price, active, brand_name')
    .eq('category_id', categoryId);

  if (error) throw error;

  const stats = {
    totalProducts: products?.length || 0,
    activeProducts: products?.filter(p => p.active).length || 0,
    inactiveProducts: products?.filter(p => !p.active).length || 0,
    totalCatalogValue: products?.reduce((sum, p) => sum + (Number(p.purchase_price) || 0), 0) || 0,
    totalMonthlyValue: products?.reduce((sum, p) => sum + (Number(p.monthly_price) || 0), 0) || 0,
    brandDistribution: products?.reduce((acc, p) => {
      const brand = p.brand_name || 'Sans marque';
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  };

  return stats;
};

// Récupérer les compatibilités d'un type
export const getTypeCompatibilities = async (type: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("category_type_compatibilities")
    .select("child_type")
    .eq("parent_type", type);

  if (error) throw error;
  return data?.map((c) => c.child_type) || [];
};

// Récupérer toutes les compatibilités
export const getAllTypeCompatibilities = async (): Promise<CategoryTypeCompatibility[]> => {
  const { data, error } = await supabase
    .from("category_type_compatibilities")
    .select("*")
    .order("parent_type", { ascending: true });

  if (error) throw error;
  return data || [];
};

// Ajouter une compatibilité de type
export const addTypeCompatibility = async (
  parentType: string,
  childType: string
): Promise<CategoryTypeCompatibility> => {
  const { data, error } = await supabase
    .from("category_type_compatibilities")
    .insert({ parent_type: parentType, child_type: childType })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Supprimer une compatibilité de type
export const deleteTypeCompatibility = async (parentType: string, childType: string): Promise<void> => {
  const { error } = await supabase
    .from("category_type_compatibilities")
    .delete()
    .eq("parent_type", parentType)
    .eq("child_type", childType);

  if (error) throw error;
};

// Définir toutes les compatibilités pour un type
export const setTypeCompatibilities = async (
  parentType: string,
  childTypes: string[]
): Promise<void> => {
  // Supprimer les anciennes compatibilités
  await supabase
    .from("category_type_compatibilities")
    .delete()
    .eq("parent_type", parentType);

  // Ajouter les nouvelles
  if (childTypes.length > 0) {
    const { error } = await supabase
      .from("category_type_compatibilities")
      .insert(childTypes.map(ct => ({ parent_type: parentType, child_type: ct })));

    if (error) throw error;
  }
};
