
import { supabase } from '@/integrations/supabase/client';

export interface Brand {
  id: string;
  name: string;
  translation: string;
  website_url?: string;
  image_search_patterns?: any;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  translation: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand_name?: string;
  brand_id?: string;
  category_name?: string;
  category_id?: string;
  image_url?: string;
  image_urls?: string[];
  short_description?: string;
  is_refurbished?: boolean;
  condition?: string;
  purchase_price?: number;
  company_id: string;
  created_at: string;
  updated_at: string;
}

// Brands CRUD operations
export const getBrands = async (): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
  
  return data || [];
};

export const addBrand = async (brand: { name: string; translation: string; website_url?: string; image_search_patterns?: any }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { data, error } = await supabase
    .from('brands')
    .insert([{
      name: brand.name,
      translation: brand.translation,
      website_url: brand.website_url,
      image_search_patterns: brand.image_search_patterns,
      company_id: profile.company_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding brand:', error);
    throw error;
  }

  return data;
};

export const updateBrand = async (params: { 
  originalName: string; 
  name: string; 
  translation: string; 
  website_url?: string; 
  image_search_patterns?: any;
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const updates: any = {
    name: params.name,
    translation: params.translation,
    updated_at: new Date().toISOString()
  };

  if (params.website_url !== undefined) {
    updates.website_url = params.website_url;
  }

  if (params.image_search_patterns !== undefined) {
    updates.image_search_patterns = params.image_search_patterns;
  }

  const { data, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('name', params.originalName)
    .eq('company_id', profile.company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating brand:', error);
    throw error;
  }

  return data;
};

export const deleteBrand = async (params: { name: string }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('name', params.name)
    .eq('company_id', profile.company_id);

  if (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
};

// Categories CRUD operations  
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  
  return data || [];
};

export const addCategory = async (category: { name: string; translation: string }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { data, error } = await supabase
    .from('categories')
    .insert([{
      name: category.name,
      translation: category.translation,
      company_id: profile.company_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding category:', error);
    throw error;
  }

  return data;
};

export const updateCategory = async (params: { originalName: string; name: string; translation: string }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: params.name,
      translation: params.translation,
      updated_at: new Date().toISOString()
    })
    .eq('name', params.originalName)
    .eq('company_id', profile.company_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
};

export const deleteCategory = async (params: { name: string }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('name', params.name)
    .eq('company_id', profile.company_id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Function to pre-configure major brands with their URLs
export const preConfigureMajorBrands = async () => {
  const majorBrands = [
    {
      name: 'Apple',
      translation: 'Apple',
      website_url: 'https://www.apple.com',
      image_search_patterns: {
        product_paths: ['/iphone/', '/ipad/', '/mac/', '/watch/', '/airpods/'],
        image_selectors: ['img[src*="product"]', '.hero-image img', '.product-image img']
      }
    },
    {
      name: 'Asus',
      translation: 'Asus',
      website_url: 'https://www.asus.com',
      image_search_patterns: {
        product_paths: ['/laptops/', '/desktops/', '/monitors/', '/components/'],
        image_selectors: ['img[src*="product"]', '.product-gallery img', '.hero-banner img']
      }
    },
    {
      name: 'Acer',
      translation: 'Acer',
      website_url: 'https://www.acer.com',
      image_search_patterns: {
        product_paths: ['/laptops/', '/desktops/', '/monitors/', '/tablets/'],
        image_selectors: ['img[src*="product"]', '.product-image img', '.gallery-image img']
      }
    },
    {
      name: 'SanDisk',
      translation: 'SanDisk',
      website_url: 'https://www.sandisk.com',
      image_search_patterns: {
        product_paths: ['/memory-cards/', '/usb-drives/', '/ssd/', '/storage/'],
        image_selectors: ['img[src*="product"]', '.product-hero img', '.product-image img']
      }
    },
    {
      name: 'UGreen',
      translation: 'UGreen',
      website_url: 'https://www.ugreen.com',
      image_search_patterns: {
        product_paths: ['/cables/', '/chargers/', '/hubs/', '/accessories/'],
        image_selectors: ['img[src*="product"]', '.product-img img', '.item-image img']
      }
    }
  ];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found for user');

  for (const brand of majorBrands) {
    try {
      // Check if brand already exists
      const { data: existing } = await supabase
        .from('brands')
        .select('id')
        .eq('name', brand.name)
        .eq('company_id', profile.company_id)
        .single();

      if (existing) {
        // Update existing brand with URL and patterns
        await supabase
          .from('brands')
          .update({
            website_url: brand.website_url,
            image_search_patterns: brand.image_search_patterns,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        console.log(`✅ Updated ${brand.name} with website URL`);
      } else {
        console.log(`⚠️ Brand ${brand.name} not found in database`);
      }
    } catch (error) {
      console.error(`❌ Error configuring ${brand.name}:`, error);
    }
  }
};
