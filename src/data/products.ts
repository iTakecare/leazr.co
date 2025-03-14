
import { Product } from "@/types/catalog";

// Sample product data if API fails
export const products: Product[] = [
  {
    id: "1",
    name: "Dell XPS 13",
    brand: "Dell",
    category: "laptop",
    description: "Puissant ordinateur portable professionnel",
    price: 1399, // Prix d'achat
    monthly_price: 45.99, // Mensualité de leasing
    imageUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9315/media-gallery/notebook-xps-9315-nt-blue-gallery-3.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402",
    specifications: {
      processor: "Intel Core i7",
      memory: "16GB",
      storage: "512GB SSD",
      display: "13.4 pouces Full HD+"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "2",
    name: "MacBook Pro 14",
    brand: "Apple",
    category: "laptop",
    description: "Ordinateur portable Apple avec puce M2 Pro",
    price: 1999,
    monthly_price: 65.99,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mbp14-spacegray-select-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1671304673229",
    specifications: {
      processor: "M2 Pro",
      memory: "16GB",
      storage: "512GB SSD", 
      display: "14 pouces Liquid Retina XDR"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "3",
    name: "iPad Pro 12.9",
    brand: "Apple",
    category: "tablet",
    description: "Tablette professionnelle avec écran Retina",
    price: 1099,
    monthly_price: 35.99,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/ipad-pro-13-select-cell-spacegray-202210?wid=940&hei=1112&fmt=png-alpha&.v=1664412732072",
    specifications: {
      processor: "M2",
      memory: "8GB",
      storage: "256GB SSD",
      display: "12.9 pouces Liquid Retina XDR"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "4",
    name: "Surface Laptop 5",
    brand: "Microsoft",
    category: "laptop",
    description: "Ordinateur portable élégant et performant",
    price: 1299,
    monthly_price: 42.99,
    imageUrl: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE59bX0?ver=a611",
    specifications: {
      processor: "Intel Core i5",
      memory: "8GB",
      storage: "256GB SSD",
      display: "13.5 pouces PixelSense"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "5",
    name: "iPhone 15 Pro",
    brand: "Apple",
    category: "smartphone",
    description: "Smartphone haut de gamme avec caméra pro",
    price: 1199,
    monthly_price: 39.99,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708",
    specifications: {
      processor: "A17 Pro",
      memory: "8GB",
      storage: "256GB",
      display: "6.1 pouces Super Retina XDR"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "6",
    name: "Samsung Galaxy S23 Ultra",
    brand: "Samsung",
    category: "smartphone",
    description: "Smartphone Android avec S Pen intégré",
    price: 1299,
    monthly_price: 42.99,
    imageUrl: "https://images.samsung.com/fr/smartphones/galaxy-s23-ultra/buy/03_Color_Selection/07_PDP_Carousel/S23Ultra_Carousel_ColorSelection_Lavender_MO.jpg",
    specifications: {
      processor: "Snapdragon 8 Gen 2",
      memory: "12GB",
      storage: "256GB",
      display: "6.8 pouces Dynamic AMOLED 2X"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "7",
    name: "ThinkPad X1 Carbon",
    brand: "Lenovo",
    category: "laptop",
    description: "Ordinateur portable professionnel léger et robuste",
    price: 1599,
    monthly_price: 52.99,
    imageUrl: "https://p2-ofp.static.pub/fes/cms/2022/04/26/dx4k8mid73gk5ldw8rkodl7c7c04pe236853.png",
    specifications: {
      processor: "Intel Core i7",
      memory: "16GB",
      storage: "512GB SSD",
      display: "14 pouces WUXGA"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  },
  {
    id: "8",
    name: "Galaxy Tab S9 Ultra",
    brand: "Samsung",
    category: "tablet",
    description: "Tablette Android haut de gamme avec stylet",
    price: 1299,
    monthly_price: 42.99,
    imageUrl: "https://images.samsung.com/is/image/samsung/p6pim/fr/sm-x910nzaeeub/gallery/fr-galaxy-tab-s9-ultra-wifi-sm-x910nzaeeub-536818644?$650_519_PNG$",
    specifications: {
      processor: "Snapdragon 8 Gen 2",
      memory: "12GB",
      storage: "256GB",
      display: "14.6 pouces Dynamic AMOLED 2X"
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  }
];

/**
 * Get a product by its ID
 */
export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

/**
 * Get products by category
 */
export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((product) => product.category === category);
};

/**
 * Get all unique product categories
 */
export const getProductCategories = (): string[] => {
  return [...new Set(products.map((product) => product.category))];
};

/**
 * Get all brands
 */
export const getProductBrands = (): string[] => {
  return [...new Set(products.map((product) => product.brand))];
};

/**
 * Search products by term
 */
export const searchProducts = (term: string): Product[] => {
  const searchTerm = term.toLowerCase();
  return products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm) ||
    product.description.toLowerCase().includes(searchTerm) ||
    product.brand.toLowerCase().includes(searchTerm) ||
    product.category.toLowerCase().includes(searchTerm)
  );
};

// Re-export the Product type for backward compatibility
export type { Product } from "@/types/catalog";
