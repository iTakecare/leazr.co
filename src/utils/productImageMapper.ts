/**
 * Product Image Mapper
 * Maps product names to high-quality images
 */

interface ProductImageMapping {
  [key: string]: string;
}

// High-quality product images from reliable sources
const PRODUCT_IMAGES: ProductImageMapping = {
  // MacBooks
  'macbook pro 14': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290',
  'macbook pro 16': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290',
  'macbook air 13': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1708367688452',
  'macbook air 15': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba15-midnight-select-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684518479433',
  
  // iPhones
  'iphone 16 pro': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-naturaltitanium?wid=5120&hei=2880&fmt=jpeg&qlt=90&.v=1725575549379',
  'iphone 16': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-ultramarine?wid=5120&hei=2880&fmt=jpeg&qlt=90&.v=1725575476674',
  'iphone 15 pro': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=jpeg&qlt=90&.v=1692895389560',
  
  // HP Laptops
  'hp elitebook 860': 'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08657264.png',
  'hp elitebook 840': 'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08657262.png',
  'hp probook 450': 'https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08470237.png',
  
  // Dell Laptops
  'dell latitude 5540': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-15-5540/media-gallery/gray/notebook-latitude-15-5540-gray-gallery-4.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402&chrss=full',
  'dell latitude 7440': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-14-7440/media-gallery/notebook-latitude-14-7440-gallery-3.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402&chrss=full',
  
  // Lenovo Laptops
  'lenovo thinkpad x1': 'https://p3-ofp.static.pub/fes/cms/2023/08/02/lh93u4s5vj1r3o2f4ajyb58h1vvzbj208648.png',
  'lenovo thinkpad t14': 'https://p3-ofp.static.pub/fes/cms/2023/08/02/65p1g3rxhvbkn5skzsawqw5xz3z4b3208522.png',
  
  // iPads
  'ipad pro': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-13-in-hero-202210?wid=1280&hei=720&fmt=jpeg&qlt=95&.v=1664411207213',
  'ipad air': 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-hero-202405?wid=1280&hei=720&fmt=jpeg&qlt=95&.v=1713308272877',
  
  // Generic fallback
  'laptop': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
  'phone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  'tablet': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&q=80',
};

/**
 * Get product image URL from product name
 * Returns null if no matching image is found
 */
export const getProductImage = (productName: string): string | null => {
  if (!productName) return null;
  
  const normalizedName = productName.toLowerCase().trim();
  
  // Try exact match first
  if (PRODUCT_IMAGES[normalizedName]) {
    return PRODUCT_IMAGES[normalizedName];
  }
  
  // Try partial matches
  for (const [key, imageUrl] of Object.entries(PRODUCT_IMAGES)) {
    if (normalizedName.includes(key)) {
      return imageUrl;
    }
  }
  
  // Fallback to generic images based on category
  if (normalizedName.includes('macbook') || normalizedName.includes('laptop') || normalizedName.includes('portable')) {
    return PRODUCT_IMAGES['laptop'];
  }
  if (normalizedName.includes('iphone') || normalizedName.includes('phone') || normalizedName.includes('téléphone')) {
    return PRODUCT_IMAGES['phone'];
  }
  if (normalizedName.includes('ipad') || normalizedName.includes('tablet') || normalizedName.includes('tablette')) {
    return PRODUCT_IMAGES['tablet'];
  }
  
  return null;
};

/**
 * Get category emoji for visual representation
 */
export const getCategoryEmoji = (productName: string): string => {
  const normalizedName = productName.toLowerCase();
  
  if (normalizedName.includes('macbook') || normalizedName.includes('laptop') || normalizedName.includes('portable')) {
    return '💻';
  }
  if (normalizedName.includes('iphone') || normalizedName.includes('phone')) {
    return '📱';
  }
  if (normalizedName.includes('ipad') || normalizedName.includes('tablet')) {
    return '📱';
  }
  if (normalizedName.includes('écran') || normalizedName.includes('monitor')) {
    return '🖥️';
  }
  if (normalizedName.includes('souris') || normalizedName.includes('mouse')) {
    return '🖱️';
  }
  if (normalizedName.includes('clavier') || normalizedName.includes('keyboard')) {
    return '⌨️';
  }
  
  return '📦';
};
