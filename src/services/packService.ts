import { supabase } from "@/integrations/supabase/client";
import { ProductPack, CreatePackData, ProductPackItem, PackCalculation } from "@/types/pack";
import { calculateSalePriceWithLeaser, getCoefficientFromLeaser } from "@/utils/leaserCalculator";
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

  // 1. Calculate total purchase price
  const total_purchase_price = items.reduce((sum, item) => 
    sum + (item.unit_purchase_price * item.quantity), 0
  );
  
  // 2. Calculate total monthly price (sum of individual monthly prices × quantities)
  const total_monthly_price = items.reduce((sum, item) => 
    sum + (item.unit_monthly_price * item.quantity), 0
  );
  
  // 3. Calculate individual financed amounts to determine global coefficient range
  const totalFinancedAmountIndividual = items.reduce((sum, item) => {
    const lineMonthly = item.unit_monthly_price * item.quantity;
    return sum + calculateSalePriceWithLeaser(lineMonthly, leaser, duration);
  }, 0);
  
  // 4. Get global coefficient based on total financed amount
  const globalCoefficient = getCoefficientFromLeaser(leaser, totalFinancedAmountIndividual, duration);
  
  // 5. Calculate financed amount using inverse Grenke formula (same as offers)
  // financed_amount = monthly_payment × 100 / coefficient
  const totalFinancedAmountDisplay = globalCoefficient > 0 
    ? Math.round((total_monthly_price * 100 / globalCoefficient) * 100) / 100
    : totalFinancedAmountIndividual;
  
  // 6. Calculate margin from financed amount - this is the real margin
  // margin = financed_amount - purchase_price
  const total_margin = Math.round((totalFinancedAmountDisplay - total_purchase_price) * 100) / 100;
  
  // 7. Calculate margin percentage based on purchase price
  const average_margin_percentage = total_purchase_price > 0 
    ? Math.round((total_margin / total_purchase_price) * 1000) / 10 // 1 decimal place
    : 0;
  
  const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  console.log("📦 Pack calculations:", {
    total_purchase_price,
    total_monthly_price,
    totalFinancedAmountIndividual,
    globalCoefficient,
    totalFinancedAmountDisplay,
    total_margin,
    average_margin_percentage,
  });

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

  // CORRECTION: Mise à jour avec préservation des prix personnalisés
  // Ne pas écraser pack_monthly_price ou pack_promo_price lors des recalculs
  const updateData: any = {
    total_purchase_price: calculations.total_purchase_price,
    total_monthly_price: calculations.total_monthly_price,
    total_margin: calculations.total_margin,
    updated_at: new Date().toISOString()
  };

  // Les prix pack_monthly_price et pack_promo_price sont préservés
  // Ils ne sont modifiés que lors d'une édition explicite par l'utilisateur

  const { error: updateError } = await supabase
    .from('product_packs')
    .update(updateData)
    .eq('id', packId);

  if (updateError) {
    console.error('Error updating pack calculations:', updateError);
    throw updateError;
  }
};