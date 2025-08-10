
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Product } from "@/types/catalog";
import ProductImage from "./product/ProductImage";
import ProductInfo from "./product/ProductInfo";
import ProductPricing from "./product/ProductPricing";
import VariantIndicator from "./product/VariantIndicator";
import CO2Badge from "@/components/ui/environmental/CO2Badge";
import { useCO2Calculator } from "@/hooks/environmental/useCO2Calculator";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onViewVariants?: (e: React.MouseEvent) => void;
  showCO2Badge?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onViewVariants, showCO2Badge = false }) => {
  if (!product) return null;
  
  // Calculate CO2 savings if badge is enabled
  const co2Result = useCO2Calculator({
    category: product.category,
    quantity: 1
  });
  
  // Check if the product has variants
  const hasVariants = 
    (product.variants && product.variants.length > 0) || 
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variation_attributes && Object.keys(product.variation_attributes).length > 0);
  
  // Count EXISTING variants for the badge - configurations that actually exist
  const getExistingVariantsCount = (): number => {
    // Add logging for debugging
    console.log(`ProductCard: Counting variants for ${product.name}:`, {
      variants_count: product.variants_count,
      combinationPrices: product.variant_combination_prices?.length,
      variants: product.variants?.length
    });
    
    // 1. If the product has a variants count defined by the server, use it
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    
    // 2. If the product has variant combination prices, count these
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    // 3. If the product has direct variants, count these
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    return 0;
  };
  
  const variantsCount = hasVariants ? getExistingVariantsCount() : 0;
  
  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-md transition-all cursor-pointer border rounded-xl bg-white relative" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        {showCO2Badge && co2Result.co2Kg > 0 && (
          <CO2Badge
            co2Kg={co2Result.co2Kg}
            size="small"
            position="top-right"
            hasRealData={co2Result.hasRealData}
            carKilometers={co2Result.carKilometers}
            className="z-10"
          />
        )}
        <div className="flex flex-col md:flex-row">
          <ProductImage product={product} />
          
          <div className="md:w-2/3 p-5">
            <ProductInfo product={product} />
            
            <div className="flex flex-wrap gap-2 my-2">
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
