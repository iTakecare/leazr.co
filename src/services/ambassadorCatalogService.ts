import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

// Récupérer les prix personnalisés d'un ambassadeur
export const getAmbassadorCustomPrices = async (ambassadorId: string) => {
  const { data, error } = await supabase
    .from('ambassador_custom_prices')
    .select(`
      *,
      products (
        id,
        name,
        price,
        monthly_price,
        image_url,
        brands (name, translation),
        categories (name, translation)
      )
    `)
    .eq('ambassador_id', ambassadorId);

  if (error) throw error;
  return data;
};

// Ajouter un prix personnalisé pour un produit
export const addAmbassadorCustomPrice = async (
  ambassadorId: string, 
  productId: string, 
  priceData: {
    margin_rate?: number;
    custom_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const { data, error } = await supabase
    .from('ambassador_custom_prices')
    .insert({
      ambassador_id: ambassadorId,
      product_id: productId,
      company_id: companyId,
      ...priceData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mettre à jour un prix personnalisé
export const updateAmbassadorCustomPrice = async (
  customPriceId: string, 
  priceData: {
    margin_rate?: number;
    custom_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const { data, error } = await supabase
    .from('ambassador_custom_prices')
    .update(priceData)
    .eq('id', customPriceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Supprimer un prix personnalisé
export const deleteAmbassadorCustomPrice = async (customPriceId: string) => {
  const { error } = await supabase
    .from('ambassador_custom_prices')
    .delete()
    .eq('id', customPriceId);

  if (error) throw error;
};

// Ajouter plusieurs produits en une fois au catalogue personnalisé
export const addMultipleProductsToAmbassadorCatalog = async (
  ambassadorId: string, 
  productIds: string[], 
  defaultMarginRate: number = 15
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const inserts = productIds.map(productId => ({
    ambassador_id: ambassadorId,
    product_id: productId,
    company_id: companyId,
    margin_rate: defaultMarginRate,
  }));

  const { data, error } = await supabase
    .from('ambassador_custom_prices')
    .insert(inserts)
    .select();

  if (error) throw error;
  return data;
};

// Ajouter un prix personnalisé pour un variant
export const addAmbassadorCustomVariantPrice = async (
  ambassadorId: string,
  variantPriceId: string,
  priceData: {
    margin_rate?: number;
    custom_monthly_price?: number;
    custom_purchase_price?: number;
  }
) => {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Company ID not found');
  }

  const { data, error } = await supabase
    .from('ambassador_custom_variant_prices')
    .insert({
      ambassador_id: ambassadorId,
      variant_price_id: variantPriceId,
      company_id: companyId,
      ...priceData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
