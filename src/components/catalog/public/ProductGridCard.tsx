
import React from "react";
import { Product } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  // Détermine si le produit a des variantes
  const hasVariants = 
    (product.variants && product.variants.length > 0) || 
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0);
  
  // Calcule le prix minimum (pour les produits avec variantes)
  const getMinPrice = (): number => {
    if (hasVariants) {
      // Pour les produits avec des prix de combinaisons
      if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        const prices = product.variant_combination_prices
          .map(variant => variant.monthly_price || 0)
          .filter(price => price > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
      }
      
      // Pour les produits avec des variantes directes
      if (product.variants && product.variants.length > 0) {
        const prices = product.variants
          .map(variant => variant.monthly_price || 0)
          .filter(price => price > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
      }
    }
    
    return product.monthly_price || 0;
  };

  const productPrice = getMinPrice();

  return (
    <div 
      className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="h-0 pb-[75%] relative overflow-hidden bg-gray-100">
        <img 
          src={product.image_url || "/placeholder.svg"} 
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            {product.brand && (
              <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
            )}
            <h3 className="font-medium text-gray-900 leading-tight">{product.name}</h3>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <AddToCartButton product={product} variant="outline" size="icon" />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 my-2">
          {product.category && (
            <Badge variant="outline" className="text-xs bg-gray-50">
              {product.category}
            </Badge>
          )}
          
          {hasVariants && (
            <Badge variant="secondary" className="text-xs">
              {product.variant_combination_prices?.length || product.variants?.length} options
            </Badge>
          )}
        </div>
        
        <div className="mt-3">
          {productPrice > 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700">
                  {hasVariants && "À partir de "}
                  <span className="font-bold text-indigo-700">{formatCurrency(productPrice)}/mois</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductGridCard;
