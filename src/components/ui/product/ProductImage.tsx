
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { Loader2 } from "lucide-react";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  
  useEffect(() => {
    // Try to get a valid image URL
    if (product) {
      setIsLoading(true);
      setHasError(false);
      
      if (product.image_url && product.image_url.trim() !== '') {
        setImageUrl(product.image_url);
      } else if (product.image_urls && product.image_urls.length > 0 && product.image_urls[0]) {
        setImageUrl(product.image_urls[0]);
      } else if ('imageUrl' in product && product.imageUrl && product.imageUrl.trim() !== '') {
        // Handle backward compatibility with old imageUrl field
        setImageUrl(product.imageUrl);
      } else {
        setImageUrl("/placeholder.svg");
        setIsLoading(false);
      }
    }
  }, [product]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };
  
  const handleImageError = () => {
    console.error("Failed to load image for product:", product.id);
    setIsLoading(false);
    setHasError(true);
    setImageUrl("/placeholder.svg");
  };
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <img 
        src={imageUrl} 
        alt={product?.name || "Product"}
        className={`object-contain h-24 w-24 transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      {hasError && (
        <div className="absolute bottom-2 left-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
          Image indisponible
        </div>
      )}
    </div>
  );
};

export default ProductImage;
