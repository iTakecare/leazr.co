import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Layers, ChevronRight } from "lucide-react";

interface ProductVariant {
  id: string;
  price: number;
  monthly_price?: number;
  attributes?: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  variants?: ProductVariant[];
  is_parent?: boolean;
  active?: boolean;
  variation_attributes?: Record<string, string[]>;
  attributes?: Record<string, any>;
  variant_combination_prices?: any[];
}

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  if (!product) return null;
  
  const productName = product?.name || "Produit sans nom";
  const productBrand = product?.brand || "";
  
  let productMonthlyPrice: string | number = "Non définie";
  let productPrice: string | number = product?.price || 0;
  let hasVariants = false;
  
  const hasVariationAttributes = 
    (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) ||
    (product.variant_combination_prices && product.variant_combination_prices.length > 0);
  
  if (typeof productPrice === 'number') {
    productPrice = formatCurrency(productPrice);
  }
  
  if ((product?.variants && product.variants.length > 0) || 
      (product?.variant_combination_prices && product.variant_combination_prices.length > 0)) {
    hasVariants = true;
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      const variantPrices = product.variant_combination_prices
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
        
      if (variantPrices.length > 0) {
        const minPrice = Math.min(...variantPrices);
        productMonthlyPrice = formatCurrency(minPrice);
      }
    } else if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map(variant => variant.monthly_price || 0)
        .filter(price => price > 0);
        
      if (variantPrices.length > 0) {
        const minPrice = Math.min(...variantPrices);
        productMonthlyPrice = formatCurrency(minPrice);
      }
    }
  } else if (product?.monthly_price) {
    productMonthlyPrice = formatCurrency(product.monthly_price);
  }
  
  const productImage = product?.image_url || "/placeholder.svg";
  
  const variantsCount = product.variant_combination_prices?.length || product.variants?.length || 0;
  
  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-md transition-all cursor-pointer border rounded-xl bg-white" 
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-4">
            <img 
              src={productImage} 
              alt={productName}
              className="object-contain h-24 w-24"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <div className="md:w-2/3 p-5">
            <h3 className="font-semibold text-lg mb-1 line-clamp-2 text-gray-900">{productName}</h3>
            {productBrand && <p className="text-sm text-gray-500 mb-2">{productBrand}</p>}
            
            <div className="flex flex-wrap gap-2 my-2">
              {product.category && (
                <Badge variant="outline" className="rounded-full text-xs bg-gray-100 text-gray-800">
                  {product.category}
                </Badge>
              )}
              
              {hasVariants && (
                <Badge className="rounded-full text-xs bg-indigo-100 text-indigo-800 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> 
                  {variantsCount} configuration{variantsCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="mt-3 space-y-1">
              {productPrice !== "0,00 €" && (
                <p className="text-gray-700">
                  Prix: <span className="font-semibold">{productPrice}</span>
                </p>
              )}
              
              {productMonthlyPrice !== "Non définie" && (
                <p className="text-gray-700">
                  {hasVariants ? "À partir de " : "Mensualité: "}
                  <span className="font-bold text-indigo-700">{productMonthlyPrice}{hasVariants && "/mois"}</span>
                </p>
              )}
            </div>
            
            {hasVariants && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button 
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  onClick={onClick}
                >
                  Voir les configurations disponibles
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
