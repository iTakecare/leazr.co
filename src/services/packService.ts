import { supabase } from "@/integrations/supabase/client";
import { ProductPack, CreatePackData, ProductPackItem, PackCalculation } from "@/types/pack";
import { calculateSalePriceWithLeaser } from "@/utils/leaserCalculator";
import { Leaser } from "@/types/equipment";

export const getPacks = async (): Promise<ProductPack[]> => {
  const { data, error } = await supabase
    .from('product_packs')
    .select(`
      *,
      items:product_pack_items!fk_product_pack_items_pack_id(
        *,
        product:products(id, name, description, image_url, brand_name, category_name, category:categories(name)),
        variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching packs:', error);
    throw error;
  }

  return data || [];
};

export const getPackById = async (id: string): Promise<ProductPack | null> => {
  const { data, error } = await supabase
    .from('product_packs')
    .select(`
      *,
      items:product_pack_items!fk_product_pack_items_pack_id(
        *,
        product:products(id, name, description, image_url, brand_name, category_name, category:categories(name)),
        variant_price:product_variant_prices(id, attributes, price, monthly_price, stock)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching pack:', error);
    throw error;
  }

  return data;
};

export const createPack = async (packData: CreatePackData): Promise<ProductPack> => {
  const { data, error } = await supabase
    .from('product_packs')
    .insert({
      ...packData,
      company_id: (await supabase.from('profiles').select('company_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single()).data?.company_id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pack:', error);
    throw error;
  }

  return data;
};

export const updatePack = async (id: string, packData: Partial<CreatePackData>): Promise<ProductPack> => {
  const { data, error } = await supabase
    .from('product_packs')
    .update(packData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pack:', error);
    throw error;
  }

  return data;
};

export const deletePack = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('product_packs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pack:', error);
    throw error;
  }
};

export const duplicatePack = async (id: string): Promise<ProductPack> => {
  // Get the original pack with items
  const originalPack = await getPackById(id);
  if (!originalPack) {
    throw new Error('Pack not found');
  }

  // Create new pack
  const newPack = await createPack({
    name: `${originalPack.name} (Copie)`,
    description: originalPack.description,
    image_url: originalPack.image_url,
    is_active: false, // Start as inactive
    is_featured: originalPack.is_featured,
    admin_only: originalPack.admin_only,
    valid_from: originalPack.valid_from ? new Date(originalPack.valid_from) : undefined,
    valid_to: originalPack.valid_to ? new Date(originalPack.valid_to) : undefined,
  });

  // Copy items if they exist
  if (originalPack.items && originalPack.items.length > 0) {
    const { createPackItems } = await import('./packItemService');
    const itemsData = originalPack.items.map(item => ({
      pack_id: newPack.id,
      product_id: item.product_id,
      variant_price_id: item.variant_price_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      unit_monthly_price: item.unit_monthly_price,
      margin_percentage: item.margin_percentage,
      custom_price_override: item.custom_price_override,
      position: item.position,
    }));

    await createPackItems(itemsData);
  }

  return await getPackById(newPack.id) || newPack;
};

export const calculatePackTotals = (
  items: ProductPackItem[], 
  leaser?: Leaser | null, 
  duration: number = 36
): PackCalculation => {
  if (!items || items.length === 0) {
    return {
      total_purchase_price: 0,
      total_monthly_price: 0,
      total_margin: 0,
      average_margin_percentage: 0,
      items_count: 0,
      total_quantity: 0,
    };
  }

  const total_purchase_price = items.reduce((sum, item) => 
    sum + (item.unit_purchase_price * item.quantity), 0
  );
  
  const total_monthly_price = items.reduce((sum, item) => 
    sum + (item.unit_monthly_price * item.quantity), 0
  );
  
  // Calculate margin using real sale price from leaser coefficient
  const total_margin = items.reduce((sum, item) => {
    const salePrice = calculateSalePriceWithLeaser(item.unit_monthly_price, leaser, duration);
    const itemMargin = (salePrice - item.unit_purchase_price) * item.quantity;
    return sum + itemMargin;
  }, 0);
  
  // Calculate simple arithmetic average of individual margin percentages
  const average_margin_percentage = items.length > 0 ?
    items.reduce((sum, item) => sum + (item.margin_percentage || 0), 0) / items.length : 0;
  
  const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    total_purchase_price,
    total_monthly_price,
    total_margin,
    average_margin_percentage,
    items_count: items.length,
    total_quantity,
  };
};

export const updatePackCalculations = async (packId: string): Promise<void> => {
  // Get pack items
  const { data: items, error } = await supabase
    .from('product_pack_items')
    .select('*')
    .eq('pack_id', packId);

  if (error) {
    console.error('Error fetching pack items for calculation:', error);
    throw error;
  }

  // Get pack data to retrieve leaser and duration
  const { data: packData } = await supabase
    .from('product_packs')
    .select('leaser_id, selected_duration')
    .eq('id', packId)
    .single();
  
  // Get leaser data if specified
  let leaser = null;
  if (packData?.leaser_id) {
    const { data: leaserData } = await supabase
      .from('leasers')
      .select('*, ranges:leaser_ranges(*)')
      .eq('id', packData.leaser_id)
      .single();
    leaser = leaserData;
  }
  
  const calculations = calculatePackTotals(items || [], leaser, packData?.selected_duration || 36);

  // Update pack with calculated values
  const { error: updateError } = await supabase
    .from('product_packs')
    .update({
      total_purchase_price: calculations.total_purchase_price,
      total_monthly_price: calculations.total_monthly_price,
      total_margin: calculations.total_margin,
    })
    .eq('id', packId);

  if (updateError) {
    console.error('Error updating pack calculations:', updateError);
    throw updateError;
  }
};