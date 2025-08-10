import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import CO2Badge from "@/components/ui/environmental/CO2Badge";
import { useCO2Calculator } from "@/hooks/environmental/useCO2Calculator";


interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}


const ProductGridCardOptimized: React.FC<ProductGridCardProps> = React.memo(({ product, onClick }) => {
  const [hasError, setHasError] = useState(false);
  
  // Calculate CO2 savings using the real environmental data
  const co2Result = useCO2Calculator({
    category: product.category,
    quantity: 1
  });

  // Optimized image URL without timestamps
  const imageUrl = useMemo(() => {
    if (product?.image_url && typeof product.image_url === 'string' && 
        product.image_url.trim() !== '' && 
        !product.image_url.includes('.emptyFolderPlaceholder') &&
        !product.image_url.includes('undefined') &&
        product.image_url !== '/placeholder.svg') {
      return product.image_url;
    }
    
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'string' && firstImage !== '/placeholder.svg') {
        return firstImage;
      } else if (firstImage && typeof firstImage === 'object' && 'url' in firstImage && firstImage.url !== '/placeholder.svg') {
        return firstImage.url;
      }
    }
    
    return "/placeholder.svg";
  }, [product.image_url, product.images]);

  // Simplified category mapping
  const categoryLabel = useMemo(() => {
    if (!product.category) return "Équipement";
    
    const categoryMap: Record<string, string> = {
      laptop: "Ordinateur portable",
      desktop: "Ordinateur fixe", 
      tablet: "Tablette",
      smartphone: "Smartphone",
      monitor: "Écran",
      printer: "Imprimante",
      accessories: "Accessoire"
    };
    
    return categoryMap[product.category.toLowerCase()] || "Équipement";
  }, [product.category]);

  const hasVariants = product.has_variants;
  const brandLabel = product.brand || "Generic";
  
  // Optimized pricing with minimum variant price
  const hasMinPrice = product.min_variant_price && product.min_variant_price > 0;
  const displayPrice = hasMinPrice ? product.min_variant_price : (product.monthly_price || product.price || 0);
  const hasPrice = displayPrice > 0;

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col border shadow-sm rounded-xl hover:border-[#4ab6c4]/30 mt-8 max-w-[250px] mx-auto"
      onClick={onClick}
    >
      <div className="relative pt-[90%] bg-white">
        <img 
          src={hasError ? "/placeholder.svg" : imageUrl} 
          alt={product.name} 
          className="absolute inset-0 object-contain w-full h-full p-5"
          onError={handleImageError}
          loading="lazy"
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
        
        {co2Result.co2Kg > 0 && (
          <CO2Badge
            co2Kg={co2Result.co2Kg}
            size="small"
            position="top-right"
            hasRealData={co2Result.hasRealData}
            carKilometers={co2Result.carKilometers}
          />
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-3">
        
        <h3 className="font-bold text-gray-900 text-xs mb-1 truncate">{product.name}</h3>
        
        <div className="mt-auto pt-1">
          {hasPrice ? (
            <div className="text-gray-700 text-xs">
              {hasVariants ? "À partir de " : ""}
              <span className="font-bold text-[#4ab6c4]">{formatCurrency(displayPrice)} HTVA/mois</span>
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
});

ProductGridCardOptimized.displayName = "ProductGridCardOptimized";

export default ProductGridCardOptimized;