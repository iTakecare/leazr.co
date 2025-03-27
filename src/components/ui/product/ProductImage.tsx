
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Try to get a valid image URL
    if (product) {
      if (product.image_url && product.image_url.trim() !== '') {
        setImageUrl(product.image_url);
      } else if (product.image_urls && product.image_urls.length > 0 && product.image_urls[0]) {
        setImageUrl(product.image_urls[0]);
      } else if (product.imageUrl && product.imageUrl.trim() !== '') {
        // Handle backward compatibility with old imageUrl field
        setImageUrl(product.imageUrl);
      } else {
        setImageUrl("/placeholder.svg");
      }
      setIsLoading(false);
    }
  }, [product]);
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4">
      {isLoading ? (
        <div className="h-24 w-24 animate-pulse bg-gray-200 rounded-md"></div>
      ) : (
        <img 
          src={imageUrl} 
          alt={product?.name || "Product"}
          className="object-contain h-24 w-24"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      )}
    </div>
  );
};

export default ProductImage;
