
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { getImageUrlWithCacheBuster } from "@/services/storageService";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  
  // Use effect to set the image URL when the product changes
  useEffect(() => {
    // Extract the URL of the image with a more robust check
    if (product?.image_url && 
        typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') &&
        !product.image_url.includes('undefined') &&
        product.image_url !== '/placeholder.svg') {
      setImageUrl(product.image_url);
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
        setImageUrl(validImages[0]);
      } else {
        setImageUrl("/placeholder.svg");
      }
    } else {
      setImageUrl("/placeholder.svg");
    }
    
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

  const processedImageUrl = getImageUrlWithCacheBuster(imageUrl);
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative aspect-square">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <div className="w-full h-full flex items-center justify-center">
        <img 
          src={processedImageUrl}
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
