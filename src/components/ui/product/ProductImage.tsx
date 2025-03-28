
import React, { useState, useEffect, useRef } from "react";
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
  const loadingRef = useRef(false);
  
  useEffect(() => {
    // Réinitialiser les états quand le produit change
    setIsLoading(true);
    setHasError(false);
    
    // Éviter les appels en double
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    // Obtenir la meilleure URL d'image
    if (product) {
      const url = getBestImageUrl();
      setImageUrl(url);
    }
    
    return () => {
      loadingRef.current = false;
    };
  }, [product, retryCount]);
  
  const getBestImageUrl = (): string => {
    if (!product) return "/placeholder.svg";
    
    // Fonction de validation simple
    const isValidUrl = (url: string | null | undefined): boolean => {
      if (!url || typeof url !== 'string' || url.trim() === '') return false;
      if (url === '/placeholder.svg') return false;
      try {
        // Validation URL de base
        new URL(url);
        return true;
      } catch (e) {
        console.warn(`Format d'URL invalide: ${url}`);
        return false;
      }
    };
    
    // D'abord vérifier image_url directement
    if (isValidUrl(product.image_url as string)) {
      return product.image_url as string;
    }
    
    // Ensuite vérifier le tableau image_urls
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const validUrl = product.image_urls.find(url => isValidUrl(url));
      if (validUrl) return validUrl;
    }
    
    // Revenir à l'image placeholder
    return "/placeholder.svg";
  };
  
  // Gérer le chargement de l'image
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    loadingRef.current = false;
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    loadingRef.current = false;
    console.error(`Échec de chargement d'image: ${imageUrl}`);
    
    // Réessayer avec un paramètre différent pour contourner le cache si erreur
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(count => count + 1);
      }, 500);
    }
  };
  
  // Ajouter un paramètre pour contourner le cache et forcer le type de contenu
  const imageUrlWithCacheBuster = () => {
    if (imageUrl === "/placeholder.svg") return imageUrl;
    
    try {
      // Ajouter un cache buster et le type de contenu
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      
      // Détecter le format de l'image à partir de l'URL
      let contentType = 'image/jpeg';
      
      // Vérifier le format WebP (vérifications plus spécifiques d'abord)
      if (imageUrl.toLowerCase().endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (imageUrl.toLowerCase().includes('/webp')) {
        contentType = 'image/webp';
      } 
      // Vérifier le format PNG
      else if (imageUrl.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else if (imageUrl.toLowerCase().includes('/png')) {
        contentType = 'image/png';
      } 
      // Vérifier le format GIF
      else if (imageUrl.toLowerCase().endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (imageUrl.toLowerCase().includes('/gif')) {
        contentType = 'image/gif';
      } 
      // Vérifier le format SVG
      else if (imageUrl.toLowerCase().endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (imageUrl.toLowerCase().includes('/svg')) {
        contentType = 'image/svg+xml';
      }
      
      // Ajouter le type de contenu à l'URL et un compteur de réessais pour forcer le contournement du cache
      return `${imageUrl}${separator}t=${timestamp}&r=${retryCount}&contentType=${encodeURIComponent(contentType)}`;
    } catch (e) {
      console.error("Erreur de formatage de l'URL de l'image:", e);
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
