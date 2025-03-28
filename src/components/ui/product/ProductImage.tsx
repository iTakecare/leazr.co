import React, { useState, useEffect, useRef } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [retryCount, setRetryCount] = useState(0);
  const loadingRef = useRef(false);
  const initDoneRef = useRef(false);
  
  useEffect(() => {
    // Initialize only once per product
    if (initDoneRef.current && product?.id === previousProductRef.current) return;
    
    // Reset states when product changes
    setIsLoading(true);
    setHasError(false);
    initDoneRef.current = true;
    previousProductRef.current = product?.id || null;
    
    // Avoid duplicate calls
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    // Get the best image URL
    if (product) {
      const url = getBestImageUrl();
      setImageUrl(url);
    }
    
    return () => {
      loadingRef.current = false;
    };
  }, [product, retryCount]);
  
  // Keep track of previous product to avoid redundant processing
  const previousProductRef = useRef<string | null>(null);
  
  const getBestImageUrl = (): string => {
    if (!product) return "/placeholder.svg";
    
    // Simple validation function
    const isValidUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string' || url.trim() === '') return false;
      if (url === '/placeholder.svg') return false;
      try {
        // Basic URL validation
        new URL(url);
        return true;
      } catch (e) {
        console.warn(`Invalid URL format: ${url}`);
        return false;
      }
    };
    
    // First check image_url directly
    if (isValidUrl(product.image_url as string)) {
      return product.image_url as string;
    }
    
    // Then check the image_urls array
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const validUrl = product.image_urls.find(url => isValidUrl(url));
      if (validUrl) return validUrl;
    }
    
    // Check with imageUrl property name variations
    if (isValidUrl(product.imageUrl as string)) {
      return product.imageUrl as string;
    }
    
    if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      const validUrl = product.imageUrls.find(url => isValidUrl(url));
      if (validUrl) return validUrl;
    }
    
    // Fall back to placeholder
    return "/placeholder.svg";
  };
  
  // Handle image loading
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    loadingRef.current = false;
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    loadingRef.current = false;
    console.error(`Failed to load image: ${imageUrl}`);
    
    // Retry with a different parameter to work around caching issues
    if (retryCount < 2 && imageUrl !== "/placeholder.svg") {
      setTimeout(() => {
        setRetryCount(count => count + 1);
      }, 500);
    }
  };
  
  // Add a parameter to work around caching and force content type
  const imageUrlWithCacheBuster = () => {
    if (imageUrl === "/placeholder.svg") return imageUrl;
    
    try {
      // Add a cache buster
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}t=${timestamp}&r=${retryCount}`;
    } catch (e) {
      console.error("Error formatting image URL:", e);
      return imageUrl;
    }
  };
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={imageUrlWithCacheBuster()}
        alt={product?.name || "Produit"}
        className="object-contain max-h-24 max-w-full"
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
