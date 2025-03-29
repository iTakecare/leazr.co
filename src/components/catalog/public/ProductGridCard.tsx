
import React, { useState, useEffect } from "react";
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
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    const url = getProductImage();
    
    setImageUrl(url);
    setIsLoading(true);
    setHasError(false);
    
    // Pas de préchargement d'image pour éviter les erreurs CORS
    // Laisser l'élément img gérer le chargement directement
  }, [product, retryCount]);
  
  if (product.is_variation || product.parent_id) {
    return null;
  }

  const brandLabel = product.brand || "Generic";
  
  const getMinimumMonthlyPrice = (): number => {
    let minPrice = product.monthly_price || 0;
    
    if (Array.isArray(product?.variant_combination_prices) && product.variant_combination_prices.length > 0) {
      const combinationPrices = product.variant_combination_prices
        .map(v => v.monthly_price || 0)
        .filter(p => p > 0);
      
      if (combinationPrices.length > 0) {
        const minCombinationPrice = Math.min(...combinationPrices);
        if (minCombinationPrice > 0 && (minPrice === 0 || minCombinationPrice < minPrice)) {
          minPrice = minCombinationPrice;
        }
      }
    }
    
    else if (product.variants && product.variants.length > 0) {
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
    
    return minPrice;
  };
  
  const monthlyPrice = getMinimumMonthlyPrice();
  const hasPrice = monthlyPrice > 0;
  
  const getProductImage = (): string => {
    if (product?.image_url && typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') &&
        !product.image_url.includes('undefined') &&
        product.image_url !== '/placeholder.svg') {
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
    
    if (product?.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      const validImages = product.imageUrls.filter(url => 
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
    
    return result;
  };
  
  const hasVariantsFlag = hasVariants();
  const variantsCount = hasVariantsFlag ? countExistingVariants() : 0;
  
  const co2Savings = getCO2Savings(product.category);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    
    if (retryCount < 2 && imageUrl !== "/placeholder.svg") {
      setRetryCount(prev => prev + 1);
    }
  };

  const addTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    // Clean any existing timestamp
    let cleanUrl = url;
    if (cleanUrl.includes('?t=') || cleanUrl.includes('&t=')) {
      cleanUrl = cleanUrl.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    }
    
    // Add new timestamp
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${Date.now()}&r=${retryCount}`;
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
        
        {!hasError && (
          <img 
            src={addTimestamp(imageUrl)} 
            alt={product.name} 
            className="absolute inset-0 object-contain w-full h-full p-5"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
            <img 
              src="/placeholder.svg" 
              alt={product.name} 
              className="w-16 h-16 object-contain opacity-50"
            />
            <div className="text-sm text-gray-500 mt-2">Image non disponible</div>
          </div>
        )}
        
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
