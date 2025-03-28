
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantIndicator from "@/components/ui/product/VariantIndicator";
import { Leaf } from "lucide-react";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const getCO2Savings = (category: string | undefined): number => {
  if (!category) return 0;
  
  switch (category.toLowerCase()) {
    case "laptop":
    case "desktop":
      return 170;
    case "smartphone":
      return 45;
    case "tablet":
      return 87;
    default:
      return 0;
  }
};

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  if (product.is_variation || product.parent_id) {
    return null;
  }

  const brandLabel = product.brand || "Generic";
  
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      console.log(`Product ${product.name} has ${product.variant_combination_prices.length} variant combinations`);
      const combinationPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        console.log(`Minimum combination price found: ${minCombinationPrice}`);
        if (minCombinationPrice > 0 && (minPrice === 0 || minCombinationPrice < minPrice)) {
          minPrice = minCombinationPrice;
          console.log(`Using combination price: ${minPrice}`);
        }
      }
    }
    
    else if (product.variants && product.variants.length > 0) {
      console.log(`Product ${product.name} has ${product.variants.length} variants`);
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
      
      if (variantPrices.length > 0) {
        const minVariantPrice = Math.min(...variantPrices);
        console.log(`Minimum variant price found: ${minVariantPrice}`);
        if (minVariantPrice > 0 && (minPrice === 0 || minVariantPrice < minPrice)) {
          minPrice = minVariantPrice;
          console.log(`Using variant price: ${minPrice}`);
        }
      }
    }
    
    return minPrice;
  };
  
  const monthlyPrice = getMinimumMonthlyPrice();
  const hasPrice = monthlyPrice > 0;
  
  const getProductImage = (): string => {
    if (product?.image_url && typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') &&
        !product.image_url.includes('undefined')) {
      return product.image_url;
    }
    
    if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      const validImages = product.image_urls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.trim() !== '' && 
        !url.includes('.emptyFolderPlaceholder') &&
        !url.includes('undefined') &&
        url !== '/placeholder.svg'
      );
      
      if (validImages.length > 0) {
        return validImages[0];
      }
    }
    
    return "/placeholder.svg";
  };
  
  const imageUrl = getProductImage();
  
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

  const countExistingVariants = (): number => {
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      console.log(`${product.name} a ${product.variant_combination_prices.length} combinaisons de prix de variantes`);
      return product.variant_combination_prices.length;
    }
    
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    return 0;
  };

  const hasVariants = (): boolean => {
    const result = 
      (product.is_parent === true) || 
      (product.variant_combination_prices && product.variant_combination_prices.length > 0) || 
      (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0) ||
      (product.variants && product.variants.length > 0);
    
    console.log(`Product ${product.name}: hasVariants = ${result}`);
    console.log(`- is_parent: ${product.is_parent}`);
    console.log(`- has variant_combination_prices: ${product.variant_combination_prices?.length > 0}`);
    console.log(`- has variation_attributes: ${product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0}`);
    console.log(`- has variants: ${product.variants?.length > 0}`);
    
    return result;
  };
  
  const hasVariantsFlag = hasVariants();
  const variantsCount = hasVariantsFlag ? countExistingVariants() : 0;
  
  const co2Savings = getCO2Savings(product.category);
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Add timestamp to prevent caching issues
  const addTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    // Add a timestamp query parameter to prevent caching
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${new Date().getTime()}`;
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border shadow-sm rounded-xl hover:border-[#4ab6c4]/30"
      onClick={onClick}
    >
      <div className="relative pt-[100%] bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={addTimestamp(imageUrl)} 
          alt={product.name} 
          className="absolute inset-0 object-contain w-full h-full p-5"
          onLoad={handleImageLoad}
          onError={(e) => {
            setIsLoading(false);
            (e.target as HTMLImageElement).src = "/placeholder.svg";
            console.error(`Error loading image for product ${product.name}:`, imageUrl);
          }}
        />
        
        {co2Savings > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] text-white text-xs px-3 py-1.5 rounded-full flex items-center shadow-sm">
              <span className="mr-1.5 text-sm">🍃</span>
              <span className="font-medium">-{co2Savings} kg CO2</span>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {product.category && (
            <Badge className="bg-[#33638e] text-white hover:bg-[#33638e]/90 rounded-full font-normal text-xs">
              {getCategoryLabel(product.category)}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="outline" className="rounded-full font-normal text-gray-600 bg-gray-50 text-xs border-[#4ab6c4]/20">
              {brandLabel}
            </Badge>
          )}
          
          <VariantIndicator 
            hasVariants={hasVariantsFlag} 
            variantsCount={variantsCount} 
          />
        </div>
        
        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
        
        <div className="mt-auto pt-2">
          {hasPrice ? (
            <div className="text-gray-700 text-sm">
              {hasVariantsFlag ? "À partir de " : ""}
              <span className="font-bold text-[#4ab6c4]">{formatCurrency(monthlyPrice)}</span>
              <span className="text-xs"> par mois</span>
            </div>
          ) : (
            <div className="text-gray-700 text-sm">
              <span className="font-medium text-[#33638e]">Prix sur demande</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
