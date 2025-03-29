
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";

interface ProductGridCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getProductImage = (): string => {
    if (imageError || !product.image_url) {
      return "/placeholder.svg";
    }
    
    return `${product.image_url}?t=${Date.now()}`;
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <Card 
      className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      {/* Image container */}
      <div className="aspect-square bg-gray-50 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <div className="w-full h-full flex items-center justify-center p-4">
          <img 
            src={getProductImage()}
            alt={product.name} 
            className="w-full h-full object-contain"
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </div>
        {product.is_parent && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Plusieurs options
          </Badge>
        )}
      </div>

      <CardContent className="flex-grow flex flex-col justify-between p-3 sm:p-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">
            {product.brand || ""}
          </div>
          <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">
            {product.name}
          </h3>
          <div className="text-xs text-gray-600 line-clamp-2">
            {product.short_description || product.description?.substring(0, 100) || ""}
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-primary text-lg font-semibold flex items-end gap-1">
            {formatCurrency(product.monthly_price || product.price / 24)}
            <span className="text-xs text-gray-600 font-normal">/mois</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
