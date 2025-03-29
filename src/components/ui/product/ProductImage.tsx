
import React, { useState, useEffect, useRef } from "react";
import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  
  // Use refs to manage component lifecycle and prevent memory leaks
  const isMounted = useRef(true);
  const productIdRef = useRef<string | null>(null);
  
  // Static cache for image URLs to avoid repeated storage requests
  const staticImageCache = useRef<Map<string, string>>(new Map());
  
  useEffect(() => {
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!product?.id || product.id === productIdRef.current) return;
    
    const loadProductImage = async () => {
      if (!isMounted.current) return;
      
      setIsLoading(true);
      setHasError(false);
      productIdRef.current = product.id;
      
      try {
        // Check cache first
        if (staticImageCache.current.has(product.id)) {
          const cachedUrl = staticImageCache.current.get(product.id);
          if (cachedUrl) {
            setImageUrl(addCacheBuster(cachedUrl));
            setIsLoading(false);
            return;
          }
        }
        
        // Try to load from Supabase storage first
        let foundImage = false;
        
        try {
          const { data: files, error } = await supabase
            .storage
            .from("product-images")
            .list(product.id);
            
          if (!error && files && files.length > 0) {
            const imageFiles = files.filter(file => 
              !file.name.startsWith('.') && 
              file.name !== '.emptyFolderPlaceholder'
            );
            
            if (imageFiles.length > 0) {
              const { data } = supabase
                .storage
                .from("product-images")
                .getPublicUrl(`${product.id}/${imageFiles[0].name}`);
                
              if (data?.publicUrl) {
                // Cache the URL
                staticImageCache.current.set(product.id, data.publicUrl);
                
                if (isMounted.current) {
                  setImageUrl(addCacheBuster(data.publicUrl));
                  setIsLoading(false);
                  foundImage = true;
                }
              }
            }
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
          // Continue to fallback options
        }
        
        // Fallback to product's image_url if storage failed
        if (!foundImage && product.image_url && typeof product.image_url === 'string') {
          staticImageCache.current.set(product.id, product.image_url);
          
          if (isMounted.current) {
            setImageUrl(product.image_url);
            setIsLoading(false);
          }
        } else if (!foundImage) {
          // Final fallback to placeholder
          if (isMounted.current) {
            setImageUrl("/placeholder.svg");
            setIsLoading(false);
            setHasError(true);
          }
        }
      } catch (err) {
        console.error("Error loading product image:", err);
        
        if (isMounted.current) {
          setImageUrl("/placeholder.svg");
          setIsLoading(false);
          setHasError(true);
        }
      }
    };
    
    loadProductImage();
  }, [product]);
  
  const handleImageLoad = () => {
    if (isMounted.current) {
      setIsLoading(false);
      setHasError(false);
    }
  };
  
  const handleImageError = () => {
    if (!isMounted.current) return;
    
    setIsLoading(false);
    setHasError(true);
    setImageUrl("/placeholder.svg");
  };
  
  // Add cache buster to prevent stale images
  const addCacheBuster = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  };
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative aspect-square">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <div className="w-full h-full flex items-center justify-center">
        <img 
          key={`img-${product.id}-${imageUrl}`}
          src={imageUrl}
          alt={product?.name || "Produit"}
          className="object-contain max-h-full max-w-full"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      </div>
      {hasError && imageUrl === "/placeholder.svg" && (
        <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
          Image non disponible
        </div>
      )}
    </div>
  );
};

export default ProductImage;
