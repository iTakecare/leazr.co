
import { Product } from "@/types/catalog";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";

// Function to map a Product type to WooCommerce product format
export const mapProductToWooCommerce = (product: Product) => {
  return {
    name: product.name,
    type: "simple",
    regular_price: String(product.price),
    description: product.description || "",
    short_description: product.description || "", // Using description for short_description
    categories: product.category ? [{ name: product.category }] : [],
    images: product.image_url ? [{ src: product.image_url }] : []
  };
};

// Mock function to test WooCommerce connection
export const testWooCommerceConnection = async (
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<boolean> => {
  console.log("Testing connection to WooCommerce:", siteUrl);
  
  try {
    // Simulate a connection test
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  } catch (error) {
    console.error("Error testing WooCommerce connection:", error);
    return false;
  }
};

// Mock function to get WooCommerce products with pagination
export const getWooCommerceProducts = async (
  siteUrl: string, 
  consumerKey: string, 
  consumerSecret: string,
  page: number = 1,
  perPage: number = 10
): Promise<WooCommerceProduct[]> => {
  console.log(`Fetching WooCommerce products page ${page} from ${siteUrl}`);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data
    return Array(perPage).fill(null).map((_, index) => ({
      id: (page - 1) * perPage + index + 1,
      name: `Product ${(page - 1) * perPage + index + 1}`,
      slug: `product-${(page - 1) * perPage + index + 1}`,
      permalink: `${siteUrl}/product/product-${(page - 1) * perPage + index + 1}`,
      date_created: new Date().toISOString(),
      date_created_gmt: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      date_modified_gmt: new Date().toISOString(),
      type: "simple",
      status: "publish",
      featured: false,
      catalog_visibility: "visible",
      description: "Sample product description",
      short_description: "Short description",
      sku: `SKU-${(page - 1) * perPage + index + 1}`,
      price: `${19.99 + index}`,
      regular_price: `${19.99 + index}`,
      sale_price: "",
      date_on_sale_from: null,
      date_on_sale_from_gmt: null,
      date_on_sale_to: null,
      date_on_sale_to_gmt: null,
      price_html: `<span class="price">€${19.99 + index}</span>`,
      on_sale: false,
      purchasable: true,
      total_sales: 0,
      virtual: false,
      downloadable: false,
      downloads: [],
      download_limit: 0,
      download_expiry: 0,
      external_url: "",
      button_text: "",
      tax_status: "taxable",
      tax_class: "",
      manage_stock: false,
      stock_quantity: null,
      stock_status: "instock",
      backorders: "no",
      backorders_allowed: false,
      backordered: false,
      sold_individually: false,
      weight: "",
      dimensions: {
        length: "",
        width: "",
        height: ""
      },
      shipping_required: true,
      shipping_taxable: true,
      shipping_class: "",
      shipping_class_id: 0,
      reviews_allowed: true,
      average_rating: "0",
      rating_count: 0,
      related_ids: [],
      upsell_ids: [],
      cross_sell_ids: [],
      parent_id: 0,
      purchase_note: "",
      categories: [
        {
          id: 1,
          name: "Uncategorized",
          slug: "uncategorized"
        }
      ],
      tags: [],
      images: [
        {
          id: 1000 + index,
          date_created: new Date().toISOString(),
          date_created_gmt: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          date_modified_gmt: new Date().toISOString(),
          src: `https://picsum.photos/id/${10 + index}/300/300`,
          name: `Product ${(page - 1) * perPage + index + 1} image`,
          alt: `Product ${(page - 1) * perPage + index + 1} image`
        }
      ],
      attributes: [],
      default_attributes: [],
      variations: [],
      grouped_products: [],
      menu_order: 0,
      meta_data: [],
      _links: {
        self: [{ href: `${siteUrl}/wp-json/wc/v3/products/${(page - 1) * perPage + index + 1}` }],
        collection: [{ href: `${siteUrl}/wp-json/wc/v3/products` }]
      }
    }));
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error);
    return [];
  }
};

// Mock function to fetch all WooCommerce products (no pagination)
export const fetchAllWooCommerceProducts = async (
  siteUrl: string, 
  consumerKey: string, 
  consumerSecret: string
): Promise<WooCommerceProduct[]> => {
  console.log(`Fetching all WooCommerce products from ${siteUrl}`);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate 25 mock products
    const totalProducts = 25;
    return Array(totalProducts).fill(null).map((_, index) => ({
      id: index + 1,
      name: `Product ${index + 1}`,
      slug: `product-${index + 1}`,
      permalink: `${siteUrl}/product/product-${index + 1}`,
      date_created: new Date().toISOString(),
      date_created_gmt: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      date_modified_gmt: new Date().toISOString(),
      type: "simple",
      status: "publish",
      featured: index % 5 === 0,
      catalog_visibility: "visible",
      description: "Sample product description with more details about the product features and benefits.",
      short_description: "Short description about the product",
      sku: `SKU-${index + 1}`,
      price: `${19.99 + index}`,
      regular_price: `${19.99 + index}`,
      sale_price: index % 3 === 0 ? `${(19.99 + index) * 0.8}` : "",
      date_on_sale_from: null,
      date_on_sale_from_gmt: null,
      date_on_sale_to: null,
      date_on_sale_to_gmt: null,
      price_html: `<span class="price">€${19.99 + index}</span>`,
      on_sale: index % 3 === 0,
      purchasable: true,
      total_sales: Math.floor(Math.random() * 50),
      virtual: false,
      downloadable: false,
      downloads: [],
      download_limit: 0,
      download_expiry: 0,
      external_url: "",
      button_text: "",
      tax_status: "taxable",
      tax_class: "",
      manage_stock: index % 2 === 0,
      stock_quantity: index % 2 === 0 ? 10 + index : null,
      stock_status: "instock",
      backorders: "no",
      backorders_allowed: false,
      backordered: false,
      sold_individually: false,
      weight: `${0.5 + (index % 5) * 0.1}`,
      dimensions: {
        length: `${10 + index}`,
        width: `${5 + index}`,
        height: `${2 + index}`
      },
      shipping_required: true,
      shipping_taxable: true,
      shipping_class: "",
      shipping_class_id: 0,
      reviews_allowed: true,
      average_rating: `${Math.floor(Math.random() * 5) + 1}`,
      rating_count: Math.floor(Math.random() * 20),
      related_ids: [],
      upsell_ids: [],
      cross_sell_ids: [],
      parent_id: 0,
      purchase_note: "",
      categories: [
        {
          id: index % 4 + 1,
          name: ["Uncategorized", "Electronics", "Furniture", "Accessories"][index % 4],
          slug: ["uncategorized", "electronics", "furniture", "accessories"][index % 4]
        }
      ],
      tags: index % 3 === 0 ? [{ id: index, name: `Tag ${index}`, slug: `tag-${index}` }] : [],
      images: [
        {
          id: 1000 + index,
          date_created: new Date().toISOString(),
          date_created_gmt: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          date_modified_gmt: new Date().toISOString(),
          src: `https://picsum.photos/id/${10 + index}/300/300`,
          name: `Product ${index + 1} image`,
          alt: `Product ${index + 1} image`
        }
      ],
      attributes: [],
      default_attributes: [],
      variations: [],
      grouped_products: [],
      menu_order: 0,
      meta_data: [],
      _links: {
        self: [{ href: `${siteUrl}/wp-json/wc/v3/products/${index + 1}` }],
        collection: [{ href: `${siteUrl}/wp-json/wc/v3/products` }]
      }
    }));
  } catch (error) {
    console.error("Error fetching all WooCommerce products:", error);
    return [];
  }
};

// Mock function to import WooCommerce products into the catalog
export const importWooCommerceProducts = async (
  products: WooCommerceProduct[],
  includeVariations: boolean = true,
  overwriteExisting: boolean = false
): Promise<ImportResult> => {
  console.log(`Importing ${products.length} WooCommerce products`);
  console.log(`Options: includeVariations=${includeVariations}, overwriteExisting=${overwriteExisting}`);
  
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful import with random number of skipped products
    const skipped = Math.floor(Math.random() * products.length / 3);
    const totalImported = products.length - skipped;
    
    return {
      success: true,
      totalImported,
      skipped,
      errors: []
    };
  } catch (error) {
    console.error("Error importing WooCommerce products:", error);
    return {
      success: false,
      totalImported: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : "Unknown error during import"]
    };
  }
};

// Mock function to get WooCommerce configuration
export const getWooCommerceConfig = async (userId: string): Promise<any> => {
  console.log(`Getting WooCommerce config for user ${userId}`);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return mock config from localStorage if available
    const savedConfig = localStorage.getItem('woocommerce_config');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    
    // Return default config
    return {
      siteUrl: "https://www.itakecare.be",
      consumerKey: "ck_09a895603eb75cc364669e8e3317fe13e607ace0",
      consumerSecret: "cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc"
    };
  } catch (error) {
    console.error("Error getting WooCommerce config:", error);
    return null;
  }
};

// Mock function to save WooCommerce configuration
export const saveWooCommerceConfig = async (
  userId: string,
  config: {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }
): Promise<boolean> => {
  console.log(`Saving WooCommerce config for user ${userId}`);
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Save to localStorage for persistence
    localStorage.setItem('woocommerce_config', JSON.stringify(config));
    
    return true;
  } catch (error) {
    console.error("Error saving WooCommerce config:", error);
    return false;
  }
};
