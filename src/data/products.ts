
import { Product } from "@/types/catalog";

// Sample product data if API fails
export const products: Product[] = [
  {
    id: "1",
    name: "Dell XPS 13",
    brand: "Dell",
    category: "laptop",
    description: "Puissant ordinateur portable professionnel",
    price: 1399,
    monthly_price: 45,
    imageUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9315/media-gallery/notebook-xps-9315-nt-blue-gallery-3.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402",
    specifications: {},
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
    monthly_price: 65,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mbp14-spacegray-select-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1671304673229",
    specifications: {},
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
    monthly_price: 35,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/ipad-pro-13-select-cell-spacegray-202210?wid=940&hei=1112&fmt=png-alpha&.v=1664412732072",
    specifications: {},
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
    monthly_price: 42,
    imageUrl: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE59bX0?ver=a611",
    specifications: {},
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
    monthly_price: 39,
    imageUrl: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708",
    specifications: {},
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
    monthly_price: 42,
    imageUrl: "https://images.samsung.com/fr/smartphones/galaxy-s23-ultra/buy/03_Color_Selection/07_PDP_Carousel/S23Ultra_Carousel_ColorSelection_Lavender_MO.jpg",
    specifications: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true
  }
];

export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((product) => product.category === category);
};

export const getProductCategories = (): string[] => {
  return [...new Set(products.map((product) => product.category))];
};

// Re-export the Product type for backward compatibility
export type { Product } from "@/types/catalog";
