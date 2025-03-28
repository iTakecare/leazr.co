
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { downloadAndStoreImage } from "@/services/storageService";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [retryCount, setRetryCount] = useState(0);
  const [isFixingImage, setIsFixingImage] = useState(false);
  
  useEffect(() => {
    // Reset states when product changes
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    
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
    setRetryCount(0);
  };
  
  const handleImageError = async () => {
    setIsLoading(false);
    setHasError(true);
    
    // More detailed error logging
    console.error(`Failed to load image: ${imageUrl}`);
    
    // Prevent infinite retry loops
    if (retryCount > 3) {
      console.error("Too many retry attempts for image:", imageUrl);
      return;
    }
    
    // Try to load the image directly via fetch to get more details about the issue
    try {
      const response = await fetch(imageUrl);
      const contentType = response.headers.get('content-type');
      
      console.log(`Image response content-type: ${contentType}`);
      
      // Check if the response is an image or not
      if (contentType && contentType.startsWith('image/')) {
        // It is an image but still not loading, try with different cache settings
        setRetryCount(prev => prev + 1);
        setImageUrl(addCacheBuster(imageUrl, true));
        return;
      }
      
      // Handle JSON response
      if (contentType?.includes('application/json')) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          console.error("Image URL returned JSON instead of an image:", json);
          toast.error("L'image a été téléchargée au mauvais format (JSON)");
          
          // Only try to fix on the first error
          if (!isFixingImage && product.id && retryCount === 0) {
            fixImageUrl();
          }
        } catch (e) {
          console.error("Image URL returned invalid JSON:", text);
        }
      } else {
        // Handle other unexpected responses
        const text = await response.text();
        if (text.length < 1000) {
          console.error("Image URL returned unexpected text:", text);
        } else {
          console.error("Image URL returned unexpected response (too large to display)");
        }
      }
    } catch (error) {
      console.error("Error fetching image details:", error);
    }
  };
  
  // Try to fix the image by re-downloading and storing it properly
  const fixImageUrl = async () => {
    if (!product.id || imageUrl === "/placeholder.svg" || isFixingImage) return;
    
    setIsFixingImage(true);
    
    try {
      toast.info("Tentative de correction de l'image...");
      
      // Try to download and store the image again
      const fixedUrl = await downloadAndStoreImage(imageUrl, "product-images", product.id);
      
      if (fixedUrl) {
        console.log("Successfully fixed image URL:", fixedUrl);
        toast.success("Image corrigée avec succès");
        setImageUrl(addCacheBuster(fixedUrl, true));
        setRetryCount(0);
        setHasError(false);
        setIsLoading(true);
      } else {
        console.error("Failed to fix image URL");
        toast.error("Impossible de corriger l'image");
      }
    } catch (error) {
      console.error("Error fixing image:", error);
      toast.error("Erreur lors de la correction de l'image");
    } finally {
      setIsFixingImage(false);
    }
  };
  
  // Add cache-busting parameter to avoid loading cached incorrect content type
  const addCacheBuster = (url: string, force = false): string => {
    if (!url || url === '/placeholder.svg') return url;
    
    // Force image content type and cache busting
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = force ? Date.now() : Math.floor(Date.now() / 10000) * 10000; // Less frequent cache busting
    return `${url}${separator}t=${timestamp}&contentType=image&forceImageType=true`;
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
