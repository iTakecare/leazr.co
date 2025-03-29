
import React, { useState } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Simplify image handling - just use the first valid image URL
  let imageUrl = "/placeholder.svg";
  
  // Find a valid image URL from the product
  if (product?.image_url) {
    imageUrl = product.image_url;
  } else if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    const validUrl = product.image_urls.find(url => 
      url && typeof url === 'string' && url.trim() !== ''
    );
    if (validUrl) {
      imageUrl = validUrl;
    }
  }
  
  // Clean up URLs with double slashes (except after protocol)
  imageUrl = imageUrl.replace(/([^:])\/\/+/g, '$1/');
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    console.log("Product image failed to load:", imageUrl);
    setIsLoading(false);
    setHasError(true);
    imageUrl = "/placeholder.svg";
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
