import { supabase } from "@/integrations/supabase/client";
import { Supplier, ProductSupplierPrice } from "@/types/catalog";

// ============================================
// SUPPLIER CRUD OPERATIONS
// ============================================

export interface CreateSupplierData {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  website?: string;
  contact_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  id: string;
}

/**
 * Récupère tous les fournisseurs de l'entreprise
 */
export async function getSuppliers(activeOnly: boolean = false): Promise<Supplier[]> {
  let query = supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }

  return data || [];
}

/**
 * Récupère un fournisseur par son ID
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching supplier:', error);
    throw error;
  }

  return data;
}

/**
 * Crée un nouveau fournisseur
 */
export async function createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
  // Get user's company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .single();

  if (!profile?.company_id) {
    throw new Error('User company not found');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      ...supplierData,
      company_id: profile.company_id,
      is_active: supplierData.is_active ?? true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }

  return data;
}

/**
 * Met à jour un fournisseur
 */
export async function updateSupplier(supplierData: UpdateSupplierData): Promise<Supplier> {
  const { id, ...updateData } = supplierData;

  const { data, error } = await supabase
    .from('suppliers')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }

  return data;
}

/**
 * Supprime un fournisseur
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
}

// ============================================
// PRODUCT SUPPLIER PRICES
// ============================================

/**
 * Récupère les prix fournisseurs pour un produit
 */
export async function getProductSupplierPrices(productId: string): Promise<ProductSupplierPrice[]> {
  const { data, error } = await supabase
    .from('product_supplier_prices')
    .select(`
      *,
      suppliers (
        id,
        name,
        code,
        email,
        phone,
        website,
        is_active
      )
    `)
    .eq('product_id', productId)
    .order('is_preferred', { ascending: false })
    .order('purchase_price', { ascending: true });

  if (error) {
    console.error('Error fetching product supplier prices:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    variant_price_id: item.variant_price_id,
    supplier_id: item.supplier_id,
    supplier: item.suppliers,
    sku: item.sku,
    purchase_price: item.purchase_price,
    currency: item.currency,
    last_price_update: item.last_price_update,
    is_preferred: item.is_preferred,
    notes: item.notes,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

/**
 * Récupère les prix fournisseurs pour un variant
 */
export async function getVariantSupplierPrices(variantId: string): Promise<ProductSupplierPrice[]> {
  const { data, error } = await supabase
    .from('product_supplier_prices')
    .select(`
      *,
      suppliers (
        id,
        name,
        code,
        email,
        phone,
        website,
        is_active
      )
    `)
    .eq('variant_price_id', variantId)
    .order('is_preferred', { ascending: false })
    .order('purchase_price', { ascending: true });

  if (error) {
    console.error('Error fetching variant supplier prices:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    variant_price_id: item.variant_price_id,
    supplier_id: item.supplier_id,
    supplier: item.suppliers,
    sku: item.sku,
    purchase_price: item.purchase_price,
    currency: item.currency,
    last_price_update: item.last_price_update,
    is_preferred: item.is_preferred,
    notes: item.notes,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

/**
 * Ajoute ou met à jour un prix fournisseur pour un produit
 */
export async function upsertProductSupplierPrice(
  productId: string,
  supplierId: string,
  purchasePrice: number,
  options?: {
    variantPriceId?: string;
    sku?: string;
    isPreferred?: boolean;
    notes?: string;
  }
): Promise<ProductSupplierPrice> {
  const { variantPriceId, sku, isPreferred, notes } = options || {};

  // If setting as preferred, unset other preferred suppliers
  if (isPreferred) {
    await supabase
      .from('product_supplier_prices')
      .update({ is_preferred: false })
      .eq('product_id', productId)
      .eq('variant_price_id', variantPriceId || null);
  }

  const { data, error } = await supabase
    .from('product_supplier_prices')
    .upsert({
      product_id: productId,
      supplier_id: supplierId,
      variant_price_id: variantPriceId || null,
      purchase_price: purchasePrice,
      sku: sku || null,
      is_preferred: isPreferred || false,
      notes: notes || null,
      last_price_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'product_id,supplier_id,variant_price_id'
    })
    .select(`
      *,
      suppliers (
        id,
        name,
        code,
        email,
        phone,
        website,
        is_active
      )
    `)
    .single();

  if (error) {
    console.error('Error upserting product supplier price:', error);
    throw error;
  }

  return {
    id: data.id,
    product_id: data.product_id,
    variant_price_id: data.variant_price_id,
    supplier_id: data.supplier_id,
    supplier: data.suppliers,
    sku: data.sku,
    purchase_price: data.purchase_price,
    currency: data.currency,
    last_price_update: data.last_price_update,
    is_preferred: data.is_preferred,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

/**
 * Supprime un prix fournisseur
 */
export async function deleteProductSupplierPrice(priceId: string): Promise<void> {
  const { error } = await supabase
    .from('product_supplier_prices')
    .delete()
    .eq('id', priceId);

  if (error) {
    console.error('Error deleting product supplier price:', error);
    throw error;
  }
}

/**
 * Récupère le fournisseur préféré pour un produit
 */
export async function getPreferredSupplier(productId: string, variantPriceId?: string): Promise<ProductSupplierPrice | null> {
  let query = supabase
    .from('product_supplier_prices')
    .select(`
      *,
      suppliers (
        id,
        name,
        code,
        email,
        phone,
        website,
        is_active
      )
    `)
    .eq('product_id', productId)
    .eq('is_preferred', true);

  if (variantPriceId) {
    query = query.eq('variant_price_id', variantPriceId);
  } else {
    query = query.is('variant_price_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching preferred supplier:', error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    product_id: data.product_id,
    variant_price_id: data.variant_price_id,
    supplier_id: data.supplier_id,
    supplier: data.suppliers,
    sku: data.sku,
    purchase_price: data.purchase_price,
    currency: data.currency,
    last_price_update: data.last_price_update,
    is_preferred: data.is_preferred,
    notes: data.notes,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}
