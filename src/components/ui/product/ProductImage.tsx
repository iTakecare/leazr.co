
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
  
  useEffect(() => {
    // Reset states when product changes
    setIsLoading(true);
    setHasError(false);
    
    // Get the best image URL
    if (product) {
      const url = getBestImageUrl();
      setImageUrl(url);
    }
  }, [product]);
  
  const getBestImageUrl = (): string => {
    if (!product) return "/placeholder.svg";
    
    // Simple validation function
    const isValidUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string' || url.trim() === '') return false;
      if (url === '/placeholder.svg') return false;
      return true;
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
  
  // Handle image errors gracefully
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // More detailed error logging
    console.error(`Failed to load image: ${imageUrl}`);
    
    // Try to load the image directly via fetch to get more details about the issue
    fetch(imageUrl)
      .then(response => response.text())
      .then(text => {
        // Check if the response looks like JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const json = JSON.parse(text);
            console.error("Image URL returned JSON instead of an image:", json);
            toast.error("L'image a été téléchargée au mauvais format (JSON)");
          } catch (e) {
            console.error("Image URL returned text that looks like JSON but couldn't be parsed");
          }
        } else if (text.length < 1000) {
          console.error("Image URL returned unexpected text:", text);
        } else {
          console.error("Image URL returned unexpected response (too large to display)");
        }
      })
      .catch(error => {
        console.error("Error fetching image details:", error);
      });
  };
  
  // Add cache-busting parameter to avoid loading cached incorrect content type
  const addCacheBuster = (url: string): string => {
    if (!url || url === '/placeholder.svg') return url;
    
    // Force image content type and cache busting
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&contentType=image&forceImageType=true`;
  };
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={addCacheBuster(imageUrl)}
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
