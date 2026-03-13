import { supabase } from "@/integrations/supabase/client";
import type { ExternalProvider, CreateExternalProviderData, ExternalProviderProduct, CreateExternalProviderProductData } from "@/types/partner";

// ============================================
// EXTERNAL PROVIDERS CRUD
// ============================================

export const fetchExternalProviders = async (companyId: string): Promise<ExternalProvider[]> => {
  const { data, error } = await supabase
    .from("external_providers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;
  return (data || []) as ExternalProvider[];
};

export const createExternalProvider = async (companyId: string, provider: CreateExternalProviderData): Promise<ExternalProvider> => {
  const { data, error } = await supabase
    .from("external_providers")
    .insert({ ...provider, company_id: companyId })
    .select()
    .single();

  if (error) throw error;
  return data as ExternalProvider;
};

export const updateExternalProvider = async (id: string, updates: Partial<CreateExternalProviderData>): Promise<ExternalProvider> => {
  const { data, error } = await supabase
    .from("external_providers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ExternalProvider;
};

export const deleteExternalProvider = async (id: string): Promise<void> => {
  const { error } = await supabase.from("external_providers").delete().eq("id", id);
  if (error) throw error;
};

// ============================================
// EXTERNAL PROVIDER PRODUCTS CRUD
// ============================================

export const fetchProviderProducts = async (providerId: string): Promise<ExternalProviderProduct[]> => {
  const { data, error } = await supabase
    .from("external_provider_products")
    .select("*")
    .eq("provider_id", providerId)
    .order("position");

  if (error) throw error;
  return (data || []) as ExternalProviderProduct[];
};

export const createProviderProduct = async (product: CreateExternalProviderProductData): Promise<ExternalProviderProduct> => {
  const { data, error } = await supabase
    .from("external_provider_products")
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data as ExternalProviderProduct;
};

export const updateProviderProduct = async (id: string, updates: Partial<CreateExternalProviderProductData>): Promise<ExternalProviderProduct> => {
  const { data, error } = await supabase
    .from("external_provider_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ExternalProviderProduct;
};

export const deleteProviderProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from("external_provider_products").delete().eq("id", id);
  if (error) throw error;
};
