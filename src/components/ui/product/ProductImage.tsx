
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
        
        // Vérifier d'abord si le produit a déjà une URL d'image définie
        if (product.image_url && typeof product.image_url === 'string' && 
            product.image_url !== "/placeholder.svg" && 
            !product.image_url.includes('undefined')) {
          
          // Ajouter un timestamp unique
          const timestamp = new Date().getTime();
          let cleanUrl = product.image_url;
          
          // Nettoyage des paramètres existants pour éviter les duplications
          if (cleanUrl.includes('?t=') || cleanUrl.includes('&t=')) {
            cleanUrl = cleanUrl.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
          }
          
          const separator = cleanUrl.includes('?') ? '&' : '?';
          const url = `${cleanUrl}${separator}t=${timestamp}&r=${retryCount}`;
          
          setImageUrl(url);
          setIsLoading(false);
          loadingRef.current = false;
          return;
        } 
        
        // Essayer d'utiliser les autres URLs d'image disponibles
        if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
          const validUrls = product.image_urls.filter(url => 
            url && typeof url === 'string' && url.trim() !== '' && 
            !url.includes('.emptyFolderPlaceholder') && !url.includes('undefined')
          );
          
          if (validUrls.length > 0) {
            let cleanUrl = validUrls[0];
            if (cleanUrl.includes('?t=') || cleanUrl.includes('&t=')) {
              cleanUrl = cleanUrl.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
            }
            
            const timestamp = new Date().getTime();
            const separator = cleanUrl.includes('?') ? '&' : '?';
            const url = `${cleanUrl}${separator}t=${timestamp}&r=${retryCount}`;
            
            setImageUrl(url);
            setIsLoading(false);
            setHasError(false);
            loadingRef.current = false;
            return;
          }
        }
        
        // Si aucune image n'est trouvée, utiliser le placeholder
        setImageUrl("/placeholder.svg");
        setIsLoading(false);
        setHasError(true);
        loadingRef.current = false;
        
      } catch (err) {
        console.error("Error in image loading process:", err);
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
