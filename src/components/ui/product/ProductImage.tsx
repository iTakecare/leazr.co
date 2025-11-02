
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  
  // Use effect to set the image URL when the product changes
  useEffect(() => {
    let validUrl = "/placeholder.svg";
    
    // Extract the URL of the image with a more robust check
    if (product?.image_url && 
        typeof product.image_url === 'string' && 
        product.image_url.trim() !== '') {
      
      // Gérer les images Base64
      if (product.image_url.startsWith('data:image')) {
        validUrl = product.image_url;
        console.log(`📸 Image Base64 détectée pour ${product.name}`);
      }
      // Gérer les URLs normales
      else if (!product.image_url.includes('.emptyFolderPlaceholder') &&
               !product.image_url.includes('undefined') &&
               product.image_url !== '/placeholder.svg') {
        
        // Nettoyer les double slashes dans les URLs Supabase
        if (product.image_url.includes('supabase.co/storage')) {
          validUrl = product.image_url.replace(/([^:])\/\//g, '$1/');
          if (validUrl !== product.image_url) {
            console.log(`🔧 Double slash nettoyé pour ${product.name}: ${product.image_url} → ${validUrl}`);
          }
        } else {
          validUrl = product.image_url;
        }
      }
    } else if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const validImages = product.image_urls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        url !== '/placeholder.svg'
      );
      
      if (validImages.length > 0) {
        let firstValidUrl = validImages[0];
        
        // Gérer les images Base64 dans le tableau
        if (firstValidUrl.startsWith('data:image')) {
          validUrl = firstValidUrl;
          console.log(`📸 Image Base64 détectée (array) pour ${product.name}`);
        }
        // Nettoyer les double slashes pour les URLs Supabase dans le tableau
        else if (firstValidUrl.includes('supabase.co/storage')) {
          validUrl = firstValidUrl.replace(/([^:])\/\//g, '$1/');
          if (validUrl !== firstValidUrl) {
            console.log(`🔧 Double slash nettoyé (array) pour ${product.name}`);
          }
        } else {
          validUrl = firstValidUrl;
        }
      }
    }
    
    setImageUrl(validUrl);
    setIsLoading(true);
    setHasError(false);
  }, [product]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log(`Image chargée avec succès: ${imageUrl}`);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(`Erreur de chargement d'image pour ${product?.name || 'produit'}: ${imageUrl}`);
    
    // If the image failed to load and it's not already the placeholder,
    // set to placeholder image
    if (imageUrl !== "/placeholder.svg") {
      setImageUrl("/placeholder.svg");
    }
  };

  // Add timestamp to image URL to prevent caching issues
  const getImageWithTimestamp = () => {
    if (imageUrl === "/placeholder.svg") return imageUrl;
    
    // Ne pas modifier les images Base64
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    
    // Ne pas ajouter de timestamp aux URLs Supabase Storage (pour éviter les problèmes de cache signed URLs)
    if (imageUrl.includes('supabase.co/storage')) {
      return imageUrl;
    }
    
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${Date.now()}`;
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
          src={getImageWithTimestamp()}
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
