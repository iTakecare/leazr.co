import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantIndicator from "@/components/ui/product/VariantIndicator";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  // Skip rendering if this is a variant
  if (product.is_variation || product.parent_id) {
    return null;
  }

  const brandLabel = product.brand || "Generic";
  
  // Determine minimum monthly price considering variants
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        if (minVariantPrice > 0 && (minPrice === 0 || minVariantPrice < minPrice)) {
          minPrice = minVariantPrice;
        }
      }
    }
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const combinationPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
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
  
  const monthlyPrice = getMinimumMonthlyPrice();
  const hasPrice = monthlyPrice > 0;
  const monthlyPriceLabel = hasPrice ? `${formatCurrency(monthlyPrice)}/mois` : "Prix sur demande";
  const imageUrl = product.image_url || product.imageUrl || "/placeholder.svg";
  
  // Get appropriate category label
  const getCategoryLabel = (category: string | undefined) => {
    if (!category) return "Autre";
    
    const categoryMap: Record<string, string> = {
      laptop: "Ordinateur portable",
      desktop: "Ordinateur fixe",
      tablet: "Tablette",
      smartphone: "Smartphone",
      monitor: "Écran",
      printer: "Imprimante",
      accessories: "Accessoire"
    };
    
    return categoryMap[category] || "Autre";
  };

  // Check if product has variants - improved detection
  const hasVariants = (): boolean => {
    // More reliable check for variants
    const isParent = product.is_parent || false;
    const hasCombPrices = product.variant_combination_prices && product.variant_combination_prices.length > 0;
    const hasVariationAttrs = product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0;
    
    return isParent || hasCombPrices || hasVariationAttrs;
  };

  // Count actual variants based on combination prices or variant products
  const getVariantsCount = (): number => {
    // If we have direct combination prices, that's the most accurate count
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    // If we have direct variants, count those
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    return 0;
  };
  
  const hasVariantsFlag = hasVariants();
  const variantsCount = getVariantsCount();
  
  // Log the variant information for debugging
  console.log(`ProductGridCard: ${product.name} variants:`, {
    hasVariants: hasVariantsFlag,
    variantsCount,
    isParent: product.is_parent,
    hasCombPrices: product.variant_combination_prices?.length > 0,
    hasVariationAttrs: product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0
  });

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border shadow-sm rounded-xl"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-white flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="object-contain max-h-full max-w-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>
      
      <CardContent className="flex-1 flex flex-col p-5 pt-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {product.category && (
            <Badge className="bg-indigo-500 text-white hover:bg-indigo-600 rounded-full font-normal">
              {getCategoryLabel(product.category)}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="outline" className="rounded-full font-normal text-gray-600 bg-gray-50">
              {brandLabel}
            </Badge>
          )}
          
          {/* Use VariantIndicator component */}
          {hasVariantsFlag && (
            <VariantIndicator 
              hasVariants={hasVariantsFlag} 
              variantsCount={variantsCount} 
            />
          )}
        </div>
        
        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{product.name}</h3>
        
        <div className="text-gray-700 text-base mt-1">
          {hasPrice && <span>à partir de </span>}
          <span className="font-bold text-indigo-700">{monthlyPriceLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
