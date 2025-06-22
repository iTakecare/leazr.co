
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { Eye, Plus } from "lucide-react";

interface CatalogProductCardProps {
  product: any;
  onViewProduct: (product: any) => void;
  onAddToCart?: (product: any) => void;
  showAddToCart?: boolean;
}

const CatalogProductCard: React.FC<CatalogProductCardProps> = ({
  product,
  onViewProduct,
  onAddToCart,
  showAddToCart = true
}) => {
  const { isAdmin } = useAuth();

  const shouldShowPurchasePrice = isAdmin;

  const getLowestPrice = () => {
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const prices = product.variant_combination_prices.map((variant: any) => 
        variant.monthly_price || variant.price || 0
      );
      return Math.min(...prices);
    }
    return product.monthly_price || product.price || 0;
  };

  const getImageUrl = () => {
    if (product.image_url) return product.image_url;
    if (product.image_urls && product.image_urls.length > 0) return product.image_urls[0];
    if (product.imageurls && product.imageurls.length > 0) return product.imageurls[0];
    return "/placeholder.svg";
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <Card className="group h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        {product.brand && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 bg-white/90 text-gray-700"
          >
            {product.brand}
          </Badge>
        )}
      </div>
      
      <CardContent className="flex flex-col flex-1 p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          
          <div className="space-y-1 mb-4">
            {shouldShowPurchasePrice && product.price > 0 && (
              <div className="text-sm text-gray-600">
                Prix: {formatCurrency(product.price)}
              </div>
            )}
            {getLowestPrice() > 0 && (
              <div className="text-lg font-bold text-indigo-600">
                À partir de {formatCurrency(getLowestPrice())}/mois
              </div>
            )}
            {getLowestPrice() === 0 && (
              <div className="text-lg font-bold text-gray-500">
                Prix sur demande
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewProduct(product)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Voir
          </Button>
          
          {showAddToCart && onAddToCart && (
            <Button 
              size="sm" 
              onClick={handleAddToCart}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CatalogProductCard;
