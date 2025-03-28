
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { toast } from "sonner";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    // Reset states when product changes
    setIsLoading(true);
    setHasError(false);
    
    // Get the best image URL
    if (product) {
      const url = getBestImageUrl();
      setImageUrl(url);
    }
  }, [product, retryCount]);
  
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
    
    // First check direct image_url
    if (isValidUrl(product.image_url as string)) {
      return product.image_url as string;
    }
    
    // Then check image_urls array
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const validUrl = product.image_urls.find(url => isValidUrl(url));
      if (validUrl) return validUrl;
    }
    
    // Fall back to placeholder
    return "/placeholder.svg";
  };
  
  // Handle image loading
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(`Failed to load image: ${imageUrl}`);
    
    // Retry with a different cache buster if there's an error
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(count => count + 1);
      }, 500);
    }
  };
  
  // Add cache-busting parameter to URL and force content type
  const imageUrlWithCacheBuster = () => {
    if (imageUrl === "/placeholder.svg") return imageUrl;
    
    try {
      // Add cache buster and content type
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      
      // Detect image format from URL
      let contentType = 'image/jpeg';
      
      // Check for WebP format (more specific checks first)
      if (imageUrl.toLowerCase().endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (imageUrl.toLowerCase().includes('/webp')) {
        contentType = 'image/webp';
      } 
      // Check for PNG format
      else if (imageUrl.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else if (imageUrl.toLowerCase().includes('/png')) {
        contentType = 'image/png';
      } 
      // Check for GIF format
      else if (imageUrl.toLowerCase().endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (imageUrl.toLowerCase().includes('/gif')) {
        contentType = 'image/gif';
      } 
      // Check for SVG format
      else if (imageUrl.toLowerCase().endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (imageUrl.toLowerCase().includes('/svg')) {
        contentType = 'image/svg+xml';
      }
      
      // Add the content type to the URL and a retry counter to force cache busting
      return `${imageUrl}${separator}t=${timestamp}&r=${retryCount}&contentType=${encodeURIComponent(contentType)}`;
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
        alt={product?.name || "Product"}
        className="object-contain h-24 w-24"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ maxWidth: '100%', height: 'auto' }}
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
