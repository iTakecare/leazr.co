import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PublicPack } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Package, Star } from "lucide-react";

interface PublicPackCardProps {
  pack: PublicPack;
  onClick: () => void;
}

const getCO2SavingsForPack = (items: Array<{ product: { category: string } }>): number => {
  return items.reduce((total, item) => {
    const category = item.product.category;
    switch (category?.toLowerCase()) {
      case "laptop":
      case "desktop":
        return total + 170;
      case "smartphone":
        return total + 45;
      case "tablet":
        return total + 87;
      default:
        return total;
    }
  }, 0);
};

const PublicPackCard: React.FC<PublicPackCardProps> = React.memo(({ pack, onClick }) => {
  const [hasError, setHasError] = useState(false);

  // Use pack image or first product image as fallback
  const imageUrl = useMemo(() => {
    if (pack?.image_url && typeof pack.image_url === 'string' && 
        pack.image_url.trim() !== '' && 
        !pack.image_url.includes('.emptyFolderPlaceholder') &&
        !pack.image_url.includes('undefined') &&
        pack.image_url !== '/placeholder.svg') {
      return pack.image_url;
    }
    
    // Try to use first product image as fallback
    const firstProductWithImage = pack.items?.find(item => 
      item.product.image_url && 
      item.product.image_url !== '/placeholder.svg'
    );
    
    if (firstProductWithImage?.product.image_url) {
      return firstProductWithImage.product.image_url;
    }
    
    return "/placeholder.svg";
  }, [pack.image_url, pack.items]);

  const co2Savings = getCO2SavingsForPack(pack.items || []);
  const itemsCount = pack.items?.length || 0;
  
  // Calculate display price
  const displayPrice = pack.promo_active && pack.pack_promo_price 
    ? pack.pack_promo_price 
    : (pack.pack_monthly_price || pack.total_monthly_price || 0);
  
  const hasPrice = displayPrice > 0;
  const hasPromo = pack.promo_active && pack.pack_promo_price && pack.pack_promo_price < (pack.pack_monthly_price || pack.total_monthly_price || 0);

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
          alt={pack.name} 
          className="absolute inset-0 object-contain w-full h-full p-5"
          onError={handleImageError}
          loading="lazy"
        />
        
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
            <Package className="w-16 h-16 text-gray-400" />
            <div className="text-sm text-gray-500 mt-2">Pack</div>
          </div>
        )}
        
        {/* Featured badge */}
        {pack.is_featured && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm">
              <Star className="w-3 h-3 mr-1" />
              En vedette
            </Badge>
          </div>
        )}

        {/* Promo badge */}
        {hasPromo && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-sm">
              PROMO
            </Badge>
          </div>
        )}
        
        {/* CO2 savings */}
        {co2Savings > 0 && (
          <div className="absolute bottom-2 right-2 z-10">
            <div className="bg-gradient-to-r from-[#33638e] to-[#4ab6c4] text-white text-xs px-3 py-1.5 rounded-full flex items-center shadow-sm">
              <span className="mr-1.5 text-sm">🍃</span>
              <span className="font-medium">-{co2Savings} kg CO2</span>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-3">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-[#4ab6c4]" />
          <h3 className="font-bold text-gray-900 text-xs truncate flex-1">{pack.name}</h3>
        </div>
        
        <div className="text-xs text-gray-600 mb-2">
          {itemsCount} produit{itemsCount > 1 ? 's' : ''} inclus
        </div>

        {pack.description && (
          <div className="text-xs text-gray-500 mb-2 line-clamp-2">
            {pack.description}
          </div>
        )}
        
        <div className="mt-auto pt-1">
          {hasPrice ? (
            <div className="text-gray-700 text-xs">
              {hasPromo && pack.pack_monthly_price && (
                <div className="text-gray-400 line-through text-xs">
                  {formatCurrency(pack.pack_monthly_price)} HTVA/mois
                </div>
              )}
              <span className="font-bold text-[#4ab6c4]">
                {formatCurrency(displayPrice)} HTVA/mois
              </span>
              {hasPromo && (
                <span className="text-red-500 text-xs ml-1">
                  ({Math.round((1 - displayPrice / (pack.pack_monthly_price || pack.total_monthly_price || displayPrice)) * 100)}% de réduction)
                </span>
              )}
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

PublicPackCard.displayName = "PublicPackCard";

export default PublicPackCard;