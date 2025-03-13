import { Product } from "@/types/catalog";
import { v4 as uuidv4 } from 'uuid';
import { products as mockProducts } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

// Create mock products if not already available
if (mockProducts.length === 0) {
  const defaultProducts = [
    {
      id: uuidv4(),
      name: "Solar Panel 400W",
      category: "Renewable Energy",
      price: 299.99,
      description: "High efficiency monocrystalline solar panel, perfect for residential installations.",
      imageUrl: "/placeholder.svg",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: "Wind Turbine 1kW",
      category: "Renewable Energy",
      price: 1299.99,
      description: "Small-scale wind turbine for residential power generation.",
      imageUrl: "/placeholder.svg",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: "Tesla Powerwall",
      category: "Energy Storage",
      price: 8500,
      description: "Home battery system that stores your solar energy to power your home at night.",
      imageUrl: "/placeholder.svg",
      brand: "Tesla",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: "Heat Pump System",
      category: "HVAC",
      price: 4200,
      description: "Energy-efficient heating and cooling system for residential use.",
      imageUrl: "/placeholder.svg",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: "Smart Thermostat",
      category: "Smart Home",
      price: 249.99,
      description: "Wi-Fi enabled thermostat that learns your habits and optimizes energy usage.",
      imageUrl: "/placeholder.svg",
      brand: "Nest",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: "LED Lighting Kit",
      category: "Lighting",
      price: 149.99,
      description: "Complete home LED lighting conversion kit to reduce energy usage.",
      imageUrl: "/placeholder.svg",
      specifications: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  mockProducts.push(...defaultProducts);
}

// Helper function to get public URL for an image in Storage
const getPublicImageUrl = (path) => {
  if (!path) return '/placeholder.svg';
  
  // If the path is already a full URL or a local path, return it
  if (path.startsWith('http') || path.startsWith('/')) {
    return path;
  }
  
  // Otherwise, construct the Supabase storage URL
  try {
    const { data } = supabase.storage.from('products').getPublicUrl(path);
    return data?.publicUrl || '/placeholder.svg';
  } catch (error) {
    console.error("Error getting public URL for image:", error);
    return '/placeholder.svg';
  }
};

// Get all products
export const getProducts = async (): Promise<Product[]> => {
  try {
    console.log("Fetching products from database...");
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error("Error fetching products from Supabase:", error);
      console.log("Falling back to mock products, count:", mockProducts.length);
      return [...mockProducts];
    }

    if (data && data.length > 0) {
      console.log(`Successfully fetched ${data.length} products from database`);
      return data.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand || undefined,
        category: item.category || 'Uncategorized',
        price: Number(item.price) || 0,
        description: item.description || '',
        imageUrl: getPublicImageUrl(item.image_url),
        specifications: item.specifications || {},
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        sku: item.sku,
        monthly_price: item.monthly_price ? Number(item.monthly_price) : undefined
      }));
    } else {
      console.log("No products found in database, using mock products");
      return [...mockProducts];
    }
  } catch (error) {
    console.error("Exception fetching products:", error);
    return [...mockProducts];
  }
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    console.log("Fetching product with ID:", id);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching product by ID:", error);
      // Try to find it in mock products as fallback
      const mockProduct = mockProducts.find(p => p.id === id);
      return mockProduct || null;
    }

    if (data) {
      console.log("Found product in database:", data);
      return {
        id: data.id,
        name: data.name,
        brand: data.brand || undefined,
        category: data.category || 'Uncategorized',
        price: Number(data.price) || 0,
        description: data.description || '',
        imageUrl: getPublicImageUrl(data.image_url),
        specifications: data.specifications || {},
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        sku: data.sku,
        monthly_price: data.monthly_price ? Number(data.monthly_price) : undefined,
        is_variation: data.is_variation,
        parent_id: data.parent_id,
        variation_attributes: data.variation_attributes,
        is_parent: data.is_parent,
        variants_ids: data.variants_ids
      };
    }
    
    console.log("No product found with ID:", id);
    return null;
  } catch (error) {
    console.error("Exception fetching product by ID:", error);
    return null;
  }
};

// Create a new product
export const createProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  const newProduct: Product = {
    ...product,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    specifications: product.specifications || {},
  };
  mockProducts.push(newProduct);
  return newProduct;
};

// Add a product (alias for createProduct to fix the import error)
export const addProduct = createProduct;

// Update an existing product
export const updateProduct = async (id: string, productData: Partial<Product>): Promise<Product> => {
  const index = mockProducts.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('Product not found');
  }
  
  const existingProduct = mockProducts[index];
  
  const updatedProduct: Product = {
    ...existingProduct,
    ...productData,
    id,
    updatedAt: new Date(),
  };
  
  mockProducts[index] = updatedProduct;
  return updatedProduct;
};

// Delete a product
export const deleteProduct = async (id: string): Promise<void> => {
  const index = mockProducts.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('Product not found');
  }
  
  mockProducts.splice(index, 1);
};

// Delete all products
export const deleteAllProducts = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  mockProducts.length = 0;
};

// Upload product image - Implement actual Supabase storage upload
export const uploadProductImage = async (file: File, productId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${productId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return URL.createObjectURL(file); // Fallback to local URL
    }

    return filePath; // Return the path for storage in the database
  } catch (error) {
    console.error('Exception during file upload:', error);
    return URL.createObjectURL(file); // Fallback to local URL
  }
};

// Clear mock products (for testing)
export const clearMockProducts = (): void => {
  mockProducts.length = 0;
};
