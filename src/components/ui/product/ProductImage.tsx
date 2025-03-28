
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  
  useEffect(() => {
    // Reset states when product changes
    setIsLoading(true);
    setHasError(false);
    
    // Initialize image URL when component mounts or product changes
    const bestImageUrl = getProductImage();
    setImageUrl(bestImageUrl);
  }, [product]);
  
  // Get the best available image URL
  const getProductImage = (): string => {
    if (!product) return "/placeholder.svg";
    
    // Check for direct image_url first
    if (product.image_url && 
        typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') && 
        !product.image_url.includes('undefined') &&
        !product.image_url.endsWith('/') &&
        product.image_url !== '/placeholder.svg') {
      return product.image_url;
    }
    
    // Try imageUrl (alternative property name)
    if (product.imageUrl && 
        typeof product.imageUrl === 'string' && 
        product.imageUrl.trim() !== '' && 
        !product.imageUrl.includes('.emptyFolderPlaceholder') && 
        !product.imageUrl.includes('undefined') &&
        !product.imageUrl.endsWith('/') &&
        product.imageUrl !== '/placeholder.svg') {
      return product.imageUrl;
    }
    
    // Check image_urls array
    if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      // Filter to ensure we have valid URLs
      const validImages = product.image_urls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        !url.endsWith('/') &&
        url !== '/placeholder.svg'
      );
      
      if (validImages.length > 0) {
        return validImages[0];
      }
    }
    
    // Check imageUrls array (alternative property name)
    if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      const validImages = product.imageUrls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        !url.endsWith('/') &&
        url !== '/placeholder.svg'
      );
      
      if (validImages.length > 0) {
        return validImages[0];
      }
    }
    
    // Check if there's an images array
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const validImages = product.images
        .map(img => typeof img === 'string' ? img : (img?.src || ''))
        .filter(url => 
          url && 
          typeof url === 'string' && 
          url.trim() !== '' && 
          !url.includes('.emptyFolderPlaceholder') &&
          !url.includes('undefined') &&
          !url.endsWith('/') &&
          url !== '/placeholder.svg'
        );
      
      if (validImages.length > 0) {
        return validImages[0];
      }
    }
    
    // Fall back to a placeholder
    return "/placeholder.svg";
  };
  
  // Add timestamp to prevent caching issues
  const getImageWithTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    try {
      // Create URL object to validate URL
      const urlObject = new URL(url);
      
      // Add a timestamp query parameter to prevent caching
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${new Date().getTime()}`;
    } catch (e) {
      // If URL is invalid, return placeholder
      console.error(`Invalid URL: ${url}`);
      return "/placeholder.svg";
    }
  };
  
  const handleImageLoad = () => {
    console.log("ProductImage - Image loaded successfully:", imageUrl);
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`ProductImage - Failed to load image: ${imageUrl}`);
    setIsLoading(false);
    setHasError(true);
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };
  
  // Improved debug to check what's happening
  useEffect(() => {
    console.log("ProductImage - Current image URL:", imageUrl);
    console.log("ProductImage - Product image properties:", {
      image_url: product?.image_url,
      imageUrl: product?.imageUrl,
      image_urls: product?.image_urls,
      imageUrls: product?.imageUrls
    });
  }, [imageUrl, product]);
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={getImageWithTimestamp(imageUrl)}
        alt={product?.name || "Product"}
        className="object-contain h-24 w-24"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      {hasError && (
        <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
          Image non disponible
        </div>
      )}
    </div>
  );
};

export default ProductImage;
