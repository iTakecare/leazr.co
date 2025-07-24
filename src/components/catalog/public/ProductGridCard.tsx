import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantIndicator from "@/components/ui/product/VariantIndicator";
import { getMinimumMonthlyPrice, hasVariantPricing } from "@/utils/productPricing";

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
  
  useEffect(() => {
    setImageUrl(getProductImage());
    setIsLoading(true);
    setHasError(false);
  }, [product]);
  
  const debugProduct = () => {
    console.log(`ProductGridCard ${product.name} (${product.id}):`);
    console.log(`- parent_id: ${product.parent_id || 'none'}`);
    console.log(`- is_parent: ${product.is_parent}`);
    console.log(`- is_variation: ${product.is_variation}`);
    console.log(`- variant_combination_prices: ${product.variant_combination_prices?.length || 0}`);
    console.log(`- variation_attributes: ${JSON.stringify(product.variation_attributes)}`);
    console.log(`- variants: ${product.variants?.length || 0}`);
    console.log(`- price: ${product.price}, monthly_price: ${product.monthly_price}`);
  };
  
  useEffect(() => {
    debugProduct();
  }, []);

  const brandLabel = product.brand || "Generic";
  
  const monthlyPrice = getMinimumMonthlyPrice(product);
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
    if (!category) return "Équipement";
    
    const categoryMap: Record<string, string> = {
      laptop: "Ordinateur portable",
      desktop: "Ordinateur fixe",
      tablet: "Tablette",
      smartphone: "Smartphone",
      monitor: "Écran",
      printer: "Imprimante",
      accessories: "Accessoire"
    };
    
    return categoryMap[category.toLowerCase()] || "Équipement";
  };

  // Simplified variant counting without logs
  const variantsCount = useMemo(() => {
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    if (product.has_variants) {
      return 1; // Default to 1 if has_variants is true but no count
    }
    return 0;
  }, [product.variants_count, product.has_variants]);

  const hasVariantsFlag = variantsCount > 0;
  const co2Savings = getCO2Savings(product.category);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error(`Failed to load product image for ${product.name}: ${imageUrl}`);
  };

  const addTimestamp = (url: string): string => {
    if (!url || url === "/placeholder.svg") return "/placeholder.svg";
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${new Date().getTime()}`;
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col border shadow-sm rounded-xl hover:border-[#4ab6c4]/30 mt-8 max-w-[250px] mx-auto"
      onClick={onClick}
    >
      <div className="relative pt-[90%] bg-white">
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
          onError={handleImageError}
          style={{ display: hasError ? 'none' : 'block' }}
        />
        
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
      
      <CardContent className="flex-1 flex flex-col p-3">
        <div className="flex flex-wrap gap-1 mb-1">
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
        
        <h3 className="font-bold text-gray-900 text-xs mb-1 truncate">{product.name}</h3>
        
        <div className="mt-auto pt-1">
          {hasPrice ? (
            <div className="text-gray-700 text-xs">
              {hasVariantsFlag ? "À partir de " : ""}
              <span className="font-bold text-[#4ab6c4]">{formatCurrency(monthlyPrice)}</span>
              <span className="text-[10px]"> par mois</span>
            </div>
          ) : (
            <div className="text-gray-700 text-xs">
              <span className="font-medium text-[#33638e]">Prix sur demande</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
