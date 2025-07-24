import { supabase } from "@/integrations/supabase/client";
import { ProductPackItem, CreatePackItemData } from "@/types/pack";

export const getPackItems = async (packId: string): Promise<ProductPackItem[]> => {
  const { data, error } = await supabase
    .from('product_pack_items')
    .select(`
      *,
      product:products(id, name, description, image_url, brand, category),
      variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
    `)
    .eq('pack_id', packId)
    .order('position');

  if (error) {
    console.error('Error fetching pack items:', error);
    throw error;
  }

  return data || [];
};

export const createPackItem = async (itemData: CreatePackItemData & { pack_id: string }): Promise<ProductPackItem> => {
  const { data, error } = await supabase
    .from('product_pack_items')
    .insert(itemData)
    .select(`
      *,
      product:products(id, name, description, image_url, brand, category),
      variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
    `)
    .single();

  if (error) {
    console.error('Error creating pack item:', error);
    throw error;
  }

  // Update pack calculations
  const { updatePackCalculations } = await import('./packService');
  await updatePackCalculations(itemData.pack_id);

  return data;
};

export const createPackItems = async (itemsData: (CreatePackItemData & { pack_id: string })[]): Promise<ProductPackItem[]> => {
  const { data, error } = await supabase
    .from('product_pack_items')
    .insert(itemsData)
    .select(`
      *,
      product:products(id, name, description, image_url, brand, category),
      variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
    `);

  if (error) {
    console.error('Error creating pack items:', error);
    throw error;
  }

  // Update pack calculations for all affected packs
  const packIds = [...new Set(itemsData.map(item => item.pack_id))];
  const { updatePackCalculations } = await import('./packService');
  
  for (const packId of packIds) {
    await updatePackCalculations(packId);
  }

  return data || [];
};

export const updatePackItem = async (id: string, itemData: Partial<CreatePackItemData>): Promise<ProductPackItem> => {
  const { data, error } = await supabase
    .from('product_pack_items')
    .update(itemData)
    .eq('id', id)
    .select(`
      *,
      product:products(id, name, description, image_url, brand, category),
      variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
    `)
    .single();

  if (error) {
    console.error('Error updating pack item:', error);
    throw error;
  }

  // Update pack calculations
  const { updatePackCalculations } = await import('./packService');
  await updatePackCalculations(data.pack_id);

  return data;
};

export const deletePackItem = async (id: string): Promise<void> => {
  // Get pack_id before deletion
  const { data: item } = await supabase
    .from('product_pack_items')
    .select('pack_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('product_pack_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pack item:', error);
    throw error;
  }

  // Update pack calculations if we have the pack_id
  if (item?.pack_id) {
    const { updatePackCalculations } = await import('./packService');
    await updatePackCalculations(item.pack_id);
  }
};

export const updatePackItemsPositions = async (items: { id: string; position: number }[]): Promise<void> => {
  const updates = items.map(item => 
    supabase
      .from('product_pack_items')
      .update({ position: item.position })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error('Error updating pack item positions:', errors);
    throw new Error('Failed to update item positions');
  }
};