
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Product } from "@/types/catalog";
import ProductImage from "./product/ProductImage";
import ProductInfo from "./product/ProductInfo";
import ProductPricing from "./product/ProductPricing";
import VariantIndicator from "./product/VariantIndicator";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onViewVariants?: (e: React.MouseEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onViewVariants }) => {
  if (!product) return null;
  
  // Check if the product has variants
  const hasVariants = 
    (product.variants && product.variants.length > 0) || 
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variation_attributes && Object.keys(product.variation_attributes).length > 0);
  
  // Count variants for the badge
  const variantsCount = product.variant_combination_prices?.length || product.variants?.length || 0;
  
  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-md transition-all cursor-pointer border rounded-xl bg-white" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <ProductImage product={product} />
          
          <div className="md:w-2/3 p-5">
            <ProductInfo product={product} />
            
            <div className="flex flex-wrap gap-2 my-2">
              {product.category && (
                <Badge variant="outline" className="rounded-full text-xs bg-gray-100 text-gray-800">
                  {product.category}
                </Badge>
              )}
              
              <VariantIndicator 
                hasVariants={hasVariants}
                variantsCount={variantsCount}
              />
            </div>
            
            <ProductPricing product={product} hasVariants={hasVariants} />
            
            {hasVariants && onViewVariants && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button 
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  onClick={onViewVariants}
                >
                  Voir les configurations disponibles
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
