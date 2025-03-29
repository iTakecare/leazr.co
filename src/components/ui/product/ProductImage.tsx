
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
  
  // Utiliser des références pour éviter les rendus en boucle
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const productIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  
  // Utiliser un cache statique pour les URLs d'images
  const staticImageCache = useRef<Map<string, string>>(new Map());
  
  useEffect(() => {
    if (!product?.id || product.id === productIdRef.current) return;
    
    setIsLoading(true);
    setHasError(false);
    productIdRef.current = product.id;
    retryCountRef.current = 0;
    
    // Vérifier si l'image est déjà en cache
    if (staticImageCache.current.has(product.id)) {
      const cachedUrl = staticImageCache.current.get(product.id);
      if (cachedUrl) {
        setImageUrl(addTimestamp(cachedUrl));
        setIsLoading(false);
        return;
      }
    }
    
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    const loadImage = async () => {
      try {
        // Essayer d'abord de charger l'image depuis Supabase storage
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
              // Mettre en cache l'URL pour les futurs rendus
              staticImageCache.current.set(product.id, data.publicUrl);
              
              const url = addTimestamp(data.publicUrl);
              setImageUrl(url);
              setIsLoading(false);
              loadingRef.current = false;
              return;
            }
          }
        }
        
        // Sinon, utiliser l'image principale du produit si disponible
        if (product.image_url && typeof product.image_url === 'string') {
          staticImageCache.current.set(product.id, product.image_url);
          setImageUrl(product.image_url);
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }
        
        // Fallback sur le placeholder
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
  }, [product]);
  
  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const handleImageLoad = () => {
    if (!mountedRef.current) return;
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    if (!mountedRef.current) return;
    
    setIsLoading(false);
    setHasError(true);
    
    // Limiter les tentatives de rechargement pour éviter les boucles infinies
    if (retryCountRef.current < 1 && imageUrl !== "/placeholder.svg") {
      retryCountRef.current++;
      
      setTimeout(() => {
        if (mountedRef.current) {
          const refreshedUrl = addTimestamp(imageUrl);
          setImageUrl(refreshedUrl);
        }
      }, 500);
    } else {
      setImageUrl("/placeholder.svg");
    }
  };
  
  // Ajouter un timestamp pour contourner le cache du navigateur
  const addTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&r=${retryCountRef.current}`;
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
          key={`img-${product.id}-${retryCountRef.current}`}
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
