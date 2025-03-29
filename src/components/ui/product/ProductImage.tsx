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
  const [retryCount, setRetryCount] = useState(0);
  const loadingRef = useRef(false);
  const initDoneRef = useRef(false);
  const previousProductRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (initDoneRef.current && product?.id === previousProductRef.current) return;
    
    setIsLoading(true);
    setHasError(false);
    initDoneRef.current = true;
    previousProductRef.current = product?.id || null;
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    const loadImage = async () => {
      try {
        if (!product?.id) {
          setImageUrl("/placeholder.svg");
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }
        
        console.log(`Loading image for product ${product.id}`);
        
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
              const timestamp = new Date().getTime();
              const url = `${data.publicUrl}?t=${timestamp}&r=${retryCount}`;
              console.log(`Using storage image: ${url}`);
              setImageUrl(url);
              setIsLoading(false);
              loadingRef.current = false;
              return;
            }
          }
        }
        
        if (product.image_url && typeof product.image_url === 'string') {
          console.log(`Using product.image_url: ${product.image_url}`);
          setImageUrl(product.image_url);
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }
        
        console.log("No valid image found, using placeholder");
        setImageUrl("/placeholder.svg");
        setIsLoading(false);
        loadingRef.current = false;
      } catch (err) {
        console.error("Error loading product image:", err);
        setImageUrl("/placeholder.svg");
        setIsLoading(false);
        setHasError(true);
        loadingRef.current = false;
      }
    };
    
    loadImage();
    
    return () => {
      loadingRef.current = false;
    };
  }, [product, retryCount]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    loadingRef.current = false;
  };
  
  const handleImageError = () => {
    console.error(`Failed to load image: ${imageUrl}`);
    setIsLoading(false);
    setHasError(true);
    loadingRef.current = false;
    
    if (retryCount < 2 && imageUrl !== "/placeholder.svg") {
      setTimeout(() => {
        setRetryCount(count => count + 1);
      }, 500);
    } else {
      setImageUrl("/placeholder.svg");
    }
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
          src={imageUrl}
          alt={product?.name || "Produit"}
          className="object-contain max-h-full max-w-full"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      </div>
      {hasError && (
        <div className="absolute bottom-2 left-2 bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
          Image non disponible
        </div>
      )}
    </div>
  );
};

export default ProductImage;
