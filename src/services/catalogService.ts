
import { Product } from "@/types/catalog";
import { v4 as uuidv4 } from 'uuid';
import { products as mockProducts } from '@/data/products';

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
    },
    {
      id: uuidv4(),
      name: "Wind Turbine 1kW",
      category: "Renewable Energy",
      price: 1299.99,
      description: "Small-scale wind turbine for residential power generation.",
      imageUrl: "/placeholder.svg",
    },
    {
      id: uuidv4(),
      name: "Tesla Powerwall",
      category: "Energy Storage",
      price: 8500,
      description: "Home battery system that stores your solar energy to power your home at night.",
      imageUrl: "/placeholder.svg",
      brand: "Tesla",
    },
    {
      id: uuidv4(),
      name: "Heat Pump System",
      category: "HVAC",
      price: 4200,
      description: "Energy-efficient heating and cooling system for residential use.",
      imageUrl: "/placeholder.svg",
    },
    {
      id: uuidv4(),
      name: "Smart Thermostat",
      category: "Smart Home",
      price: 249.99,
      description: "Wi-Fi enabled thermostat that learns your habits and optimizes energy usage.",
      imageUrl: "/placeholder.svg",
      brand: "Nest",
    },
    {
      id: uuidv4(),
      name: "LED Lighting Kit",
      category: "Lighting",
      price: 149.99,
      description: "Complete home LED lighting conversion kit to reduce energy usage.",
      imageUrl: "/placeholder.svg",
    },
  ];

  mockProducts.push(...defaultProducts);
}

// Get all products
export const getProducts = async (): Promise<Product[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [...mockProducts];
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product | null> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const product = mockProducts.find(p => p.id === id);
  return product || null;
};

// Create a new product
export const createProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  const newProduct = {
    ...product,
    id: uuidv4(),
  };
  mockProducts.push(newProduct);
  return newProduct;
};

// Update an existing product
export const updateProduct = async (id: string, productData: Omit<Product, 'id'>): Promise<Product> => {
  const index = mockProducts.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error('Product not found');
  }
  
  const updatedProduct = {
    ...productData,
    id,
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
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  // Clear the array
  mockProducts.length = 0;
};

// Clear mock products (for testing)
export const clearMockProducts = (): void => {
  mockProducts.length = 0;
};
