import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Layers } from "lucide-react";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";

interface CatalogProductCardProps {
  product: Product;
  onClick?: () => void;
  onViewVariants?: (e: React.MouseEvent) => void;
}

const CatalogProductCard: React.FC<CatalogProductCardProps> = ({ product, onClick, onViewVariants }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isAdmin } = useAuth();
  
  if (!product) return null;
  
  // Check if the product has variants
  const hasVariants = 
    (product.variants && product.variants.length > 0) || 
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0);
  
  const variantsCount = hasVariants 
    ? (product.variants_count || product.variant_combination_prices?.length || 0)
    : 0;
    
  // Get minimum price across all variants
  const getMinimumPrice = (): number => {
    let minPrice = product.price || 0;
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const combinationPrices = product.variant_combination_prices
        .map(variant => variant.price || 0)
        .filter(price => price > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        if (minCombinationPrice > 0 && (minPrice === 0 || minCombinationPrice < minPrice)) {
          minPrice = minCombinationPrice;
        }
      }
    }
    
    return minPrice;
  };
  
  // Get minimum monthly price across all variants
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const combinationPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        if (minCombinationPrice > 0) {
          minPrice = minCombinationPrice;
        }
      }
    }
    
    if (product.variants && product.variants.length > 0 && minPrice === 0) {
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        if (minVariantPrice > 0) {
          minPrice = minVariantPrice;
        }
      }
    }
    
    return minPrice;
  };
  
  const price = getMinimumPrice();
  const monthlyPrice = getMinimumMonthlyPrice();
  const hasPrice = price > 0 || monthlyPrice > 0;
  
  // Only admin should see purchase prices
  const shouldShowPurchasePrice = isAdmin();
  
  return (
    <Card 
      className="h-full overflow-hidden transition-all cursor-pointer border hover:shadow-md rounded-xl bg-white" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          {/* Image Area */}
          <div className="relative h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
            {!imageLoaded && !imageError && (
              <Skeleton className="w-full h-full absolute inset-0" />
            )}
            
            {!imageError && (
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.name || "Produit"}
                className={`object-contain w-full h-full p-2 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ transition: "opacity 0.3s" }}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.log(`Failed to load image for ${product.name}`);
                  setImageError(true);
                }}
                loading="lazy"
              />
            )}
            
            {imageError && (
              <div className="flex flex-col items-center justify-center h-full w-full p-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">{product.name?.charAt(0) || "P"}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Content Area */}
          <div className="p-3 flex-1 flex flex-col">
            {product.brand && (
              <div className="text-xs text-gray-500 mb-1">{product.brand}</div>
            )}
            
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
              {product.name || "Produit sans nom"}
            </h3>
            
            <div className="flex gap-2 mt-auto">
              {product.category && (
                <Badge variant="outline" className="rounded-full text-xs bg-gray-100 text-gray-800">
                  {product.category}
                </Badge>
              )}
              
              {hasVariants && variantsCount > 0 && (
                <Badge variant="outline" className="rounded-full text-xs bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {variantsCount} config{variantsCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
              <div>
                {monthlyPrice > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-blue-600">
                      {hasVariants ? "À partir de " : ""}
                      {formatCurrency(monthlyPrice)}
                      <span className="text-gray-500 font-normal text-xs"> /mois</span>
                    </span>
                    {price > 0 && shouldShowPurchasePrice && (
                      <span className="text-xs text-gray-500">
                        Prix: {hasVariants ? "À partir de " : ""}
                        {formatCurrency(price)}
                      </span>
                    )}
                  </div>
                ) : price > 0 && shouldShowPurchasePrice ? (
                  <div className="text-sm font-semibold">
                    {hasVariants ? "À partir de " : ""}
                    {formatCurrency(price)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Prix sur demande</div>
                )}
              </div>
              
              {hasVariants && onViewVariants && (
                <button 
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  onClick={onViewVariants}
                >
                  Configs
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogProductCard;
