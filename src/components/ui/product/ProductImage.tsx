
import React from "react";
import { Product } from "@/types/catalog";

interface ProductImageProps {
  product: Product;
}

const ProductImage: React.FC<ProductImageProps> = ({ product }) => {
  const productImage = product?.image_url || "/placeholder.svg";
  
  return (
    <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4">
      <img 
        src={productImage} 
        alt={product?.name || "Product"}
        className="object-contain h-24 w-24"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder.svg";
        }}
      />
    </div>
  );
};

export default ProductImage;
