
import React, { useState } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Get the best available image URL
  const getProductImage = (): string => {
    // If there's a direct image_url, use that first
    if (product?.image_url) {
      return product.image_url;
    }
    
    // If there are image_urls array and it has at least one item, use the first
    if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const firstValidImage = product.image_urls.find(url => url && typeof url === 'string' && url.trim() !== '');
      if (firstValidImage) {
        return firstValidImage;
      }
    }
    
    // Fall back to a placeholder
    return "/placeholder.svg";
  };
  
  const productImage = getProductImage();
  
  // Add timestamp to prevent caching issues
  const getImageWithTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${new Date().getTime()}`;
  };
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    console.error(`Failed to load product image: ${productImage}`);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={getImageWithTimestamp(productImage)}
        alt={product?.name || "Product"}
        className="object-contain h-24 w-24"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

export default ProductImage;
