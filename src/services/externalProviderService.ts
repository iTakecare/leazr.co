import { supabase } from "@/integrations/supabase/client";
import type {
  ExternalProvider,
  CreateExternalProviderData,
  ExternalProviderProduct,
  CreateExternalProviderProductData,
  ExternalProviderWithProducts,
  OfferExternalProviderProduct,
  SelectedExternalProviderProduct,
} from "@/types/partner";

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

// ============================================
// CATALOG-FACING QUERIES
// ============================================

// Returns active + catalog-visible providers along with their active products.
// Used as upsell on public/ambassador/client product detail pages.
export const fetchCatalogExternalProviders = async (
  companyId: string
): Promise<ExternalProviderWithProducts[]> => {
  const { data: providers, error } = await supabase
    .from("external_providers")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq("is_visible_in_catalog", true)
    .order("name");

  if (error) throw error;
  if (!providers || providers.length === 0) return [];

  const providerIds = providers.map((p) => p.id);
  const { data: products, error: productsError } = await supabase
    .from("external_provider_products")
    .select("*")
    .in("provider_id", providerIds)
    .eq("is_active", true)
    .order("position");

  if (productsError) throw productsError;

  return providers.map((p) => ({
    ...(p as ExternalProvider),
    products: (products || []).filter((prod) => prod.provider_id === p.id) as ExternalProviderProduct[],
  }));
};

// ============================================
// OFFER ↔ EXTERNAL SERVICES
// ============================================
// Writes to the existing public.offer_external_services table (created
// 20260314) — the same table used by the public create-product-request
// edge function. The table stores plain text snapshots (no FK to provider
// rows) so historical offers remain readable even if the provider catalog
// changes.

export const saveOfferExternalProviderProducts = async (
  offerId: string,
  selections: SelectedExternalProviderProduct[]
): Promise<void> => {
  if (!selections || selections.length === 0) return;

  const rows = selections.map((s) => ({
    offer_id: offerId,
    provider_name: s.provider_name,
    product_name: s.product_name,
    price_htva: s.price_htva,
    billing_period: s.billing_period,
    quantity: s.quantity,
  }));

  const { error } = await supabase.from("offer_external_services").insert(rows);
  if (error) throw error;
};

export const fetchOfferExternalProviderProducts = async (
  offerId: string
): Promise<OfferExternalProviderProduct[]> => {
  const { data, error } = await supabase
    .from("offer_external_services")
    .select("*")
    .eq("offer_id", offerId)
    .order("created_at");

  if (error) throw error;
  return (data || []) as OfferExternalProviderProduct[];
};
