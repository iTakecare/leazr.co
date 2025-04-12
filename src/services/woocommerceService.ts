
import { Product } from '@/types/catalog';

// Convert product specifications to attributes for WooCommerce
const convertSpecificationsToAttributes = (specifications: Record<string, string> | undefined): any[] => {
  if (!specifications) return [];
  
  return Object.entries(specifications).map(([name, value]) => ({
    name,
    visible: true,
    options: [value]
  }));
};

// Convert product to WooCommerce format
export const convertProductToWooCommerce = (product: Product): any => {
  return {
    name: product.name,
    type: "simple",
    regular_price: product.price.toString(),
    description: product.description || "",
    short_description: product.description?.substring(0, 150) || "",
    categories: product.category ? [{ name: product.category }] : [],
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
    attributes: convertSpecificationsToAttributes(product.specifications)
  };
};

// Convert WooCommerce product to our format
export const convertWooCommerceToProduct = (wcProduct: any): Product => {
  // Function to convert WooCommerce attributes to specifications
  const convertAttributesToSpecs = (attributes: any[]): Record<string, string> => {
    if (!attributes || !Array.isArray(attributes)) return {};
    
    const specs: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr.options && attr.options.length > 0) {
        specs[attr.name] = attr.options[0];
      }
    });
    return specs;
  };
  
  return {
    id: wcProduct.id.toString(),
    name: wcProduct.name,
    description: wcProduct.description,
    price: parseFloat(wcProduct.price || wcProduct.regular_price || "0"),
    image_url: wcProduct.images && wcProduct.images.length > 0 ? wcProduct.images[0].src : undefined,
    category: wcProduct.categories && wcProduct.categories.length > 0 ? wcProduct.categories[0].name : undefined,
    brand: undefined, // WooCommerce doesn't have a built-in brand attribute
    specifications: convertAttributesToSpecs(wcProduct.attributes),
    active: wcProduct.status === "publish",
    sku: wcProduct.sku
  };
};
