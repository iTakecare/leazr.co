import { Product } from "@/types/catalog";

// Function to map a Product type to WooCommerce product format
export const mapProductToWooCommerce = (product: Product) => {
  return {
    name: product.name,
    type: "simple",
    regular_price: String(product.price),
    description: product.description || "",
    short_description: product.description || "", // Fixed from shortDescription to description
    categories: product.category ? [{ name: product.category }] : [],
    images: product.image_url ? [{ src: product.image_url }] : []
  };
};
