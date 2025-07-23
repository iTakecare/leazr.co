import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog";

interface AmbassadorProductCardProps {
  product: Product;
  onClick?: () => void;
}

const AmbassadorProductCard: React.FC<AmbassadorProductCardProps> = ({
  product,
  onClick
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Determine if product has variants
  const hasVariants = Boolean(
    product.variants_count > 0 ||
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variants && product.variants.length > 0)
  );

  // Calculate minimum price across all variants
  const getMinimumPrice = () => {
    let prices: number[] = [];
    
    // Add regular price if available
    if (product.price && product.price > 0) {
      prices.push(product.price);
    }
    
    // Add variant combination prices
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantPrices = product.variant_combination_prices
        .map(v => v.price)
        .filter(price => price !== null && price !== undefined && price > 0);
      prices.push(...variantPrices);
    }
    
    // Add variant prices
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map(v => v.price)
        .filter(price => price !== null && price !== undefined && price > 0);
      prices.push(...variantPrices);
    }
    
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  // Calculate minimum monthly price
  const getMinimumMonthlyPrice = () => {
    let monthlyPrices: number[] = [];
    
    // Add regular monthly price if available
    if (product.monthly_price && product.monthly_price > 0) {
      monthlyPrices.push(product.monthly_price);
    }
    
    // Add variant combination monthly prices
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantMonthlyPrices = product.variant_combination_prices
        .map(v => v.monthly_price)
        .filter(price => price !== null && price !== undefined && price > 0);
      monthlyPrices.push(...variantMonthlyPrices);
    }
    
    // Add variant monthly prices
    if (product.variants && product.variants.length > 0) {
      const variantMonthlyPrices = product.variants
        .map(v => v.monthly_price)
        .filter(price => price !== null && price !== undefined && price > 0);
      monthlyPrices.push(...variantMonthlyPrices);
    }
    
    return monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : null;
  };

  const minPrice = getMinimumPrice();
  const minMonthlyPrice = getMinimumMonthlyPrice();

  return (
    <Card className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group">
      <CardContent className="p-4" onClick={onClick}>
        <div className="space-y-3">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {imageLoading && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            
            {!imageError ? (
              <img
                src={product.imageUrl || product.image_url || (product.images && product.images[0]?.src) || "/placeholder.svg"}
                alt={product.name}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Image non disponible</p>
                </div>
              </div>
            )}

            {/* View Details Icon */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            {/* Product Name */}
            <h3 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            {/* Brand and Category */}
            <div className="flex flex-wrap gap-1">
              {product.brand && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {product.brand}
                </Badge>
              )}
              {product.category && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {product.category}
                </Badge>
              )}
            </div>

            {/* Variants indicator */}
            {hasVariants && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>Plusieurs configurations</span>
              </div>
            )}

            {/* Price Display */}
            <div className="space-y-1">
              {minPrice && minPrice > 0 ? (
                <>
                  <div className="font-semibold text-foreground">
                    {hasVariants && "À partir de "}
                    {formatCurrency(minPrice)}
                  </div>
                  {minMonthlyPrice && minMonthlyPrice > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(minMonthlyPrice)}/mois
                    </div>
                  )}
                </>
              ) : (
                <div className="font-semibold text-muted-foreground">
                  Prix sur demande
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AmbassadorProductCard;