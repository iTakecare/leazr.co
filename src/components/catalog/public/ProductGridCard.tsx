
import React from "react";
import { Product } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  const isInStock = product.stock && product.stock > 0;
  
  // Determine the primary image to display
  const primaryImage = product.image_url || 
                      (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null) ||
                      "/placeholder.svg";
  
  // Check if the product has variants (either is a parent or has variation attributes)
  const hasVariants = product.is_parent || 
                     (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) ||
                     (product.variant_combination_prices && product.variant_combination_prices.length > 0);
  
  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300 h-full flex flex-col overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-100">
        <img 
          src={primaryImage} 
          alt={product.name || "Product image"} 
          className="w-full h-full object-contain p-2"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        
        {hasVariants && (
          <Badge className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700">
            {product.variant_combination_prices?.length || product.variants?.length || 0} configurations
          </Badge>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        {product.brand && (
          <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
        )}
        
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg text-[#33638e]">
                {hasVariants 
                  ? `À partir de ${formatCurrency(product.price)}` 
                  : formatCurrency(product.price)
                }
              </div>
              {product.monthly_price > 0 && (
                <div className="text-sm text-gray-600">
                  soit {formatCurrency(product.monthly_price)}/mois
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              {isInStock ? (
                <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>En stock</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Sur commande</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGridCard;
