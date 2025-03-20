
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { Layers, Tag } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  // Ensure we have valid data for display
  const productName = product?.name || "Produit sans nom";
  
  // Calculate minimum monthly price from variants if they exist
  let productMonthlyPrice = "Non définie";
  let productPrice = "Non défini";
  let hasVariants = false;
  
  if (product?.price !== undefined) {
    productPrice = formatCurrency(product.price);
  }
  
  // Check if product has variants or variant combination prices
  const hasVariantCombinations = product?.variant_combination_prices && 
                                product.variant_combination_prices.length > 0;
  
  // Check if product has variants
  if (product?.variants && product.variants.length > 0) {
    hasVariants = true;
    
    // Get all valid monthly prices from variants
    const variantPrices = product.variants
      .map(variant => variant.monthly_price || 0)
      .filter(price => price > 0);
      
    if (variantPrices.length > 0) {
      const minPrice = Math.min(...variantPrices);
      productMonthlyPrice = formatCurrency(minPrice);
    }
  } else if (product?.monthly_price) {
    // If no variants but product has monthly price
    productMonthlyPrice = formatCurrency(product.monthly_price);
  }
  
  // Also check if product has variation attributes, indicating it's a parent product
  const hasVariationAttributes = product?.variation_attributes && 
                                Object.keys(product.variation_attributes).length > 0;
  
  // If product has variation attributes or variant combinations, it's considered to have variants
  if (hasVariationAttributes || hasVariantCombinations) {
    hasVariants = true;
  }
  
  const productImage = product?.image_url || "/placeholder.svg";
  
  const isVariant = !!product.parent_id;
  const isParent = product.is_parent || hasVariants;

  // Calculate the number of variants or variations
  const getVariationsCount = () => {
    // First check for actual variants
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    // Check for variation attributes (combinations of attribute values)
    if (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) {
      // For variation attributes, calculate possible combinations
      const attributes = product.variation_attributes;
      
      // If we have variant_combination_prices, use their length as it's more accurate
      if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        return product.variant_combination_prices.length;
      }
      
      // Otherwise calculate from variation attributes
      const attributeKeys = Object.keys(attributes);
      if (attributeKeys.length > 0) {
        // Calculate total combinations by multiplying the number of values for each attribute
        return attributeKeys.reduce((total, key) => {
          const values = attributes[key];
          return total * (Array.isArray(values) ? values.length : 1);
        }, 1);
      }
    }
    
    return 0;
  };

  // Afficher les attributs du produit sous forme de tags
  const renderAttributeTags = () => {
    if (!product.attributes || Object.keys(product.attributes).length === 0) {
      return null;
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(product.attributes).slice(0, 3).map(([key, value]) => (
          <Badge 
            key={`${product.id}-${key}`}
            variant="outline" 
            className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex items-center px-2 py-0.5"
          >
            <Tag className="h-3 w-3 mr-1" />
            {`${key}: ${value}`}
          </Badge>
        ))}
      </div>
    );
  };

  // Afficher les attributs de variation disponibles
  const renderVariationAttributeTags = () => {
    if (!isParent || !product.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
      return null;
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(product.variation_attributes).slice(0, 2).map(([key, _]) => (
          <Badge 
            key={`var-${product.id}-${key}`}
            variant="outline" 
            className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center px-2 py-0.5"
          >
            <Tag className="h-3 w-3 mr-1" />
            {key}
          </Badge>
        ))}
      </div>
    );
  };

  const variantsCount = getVariationsCount();

  return (
    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white" onClick={onClick}>
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
            <img 
              src={productImage} 
              alt={productName}
              className="object-contain h-20 w-20"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <div className="w-2/3 p-4">
            <h3 className="font-medium text-sm mb-1 line-clamp-2">{productName}</h3>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Prix: {productPrice}
              </p>
              <p className="text-muted-foreground">
                {hasVariants ? "À partir de " : "Mensualité: "}{productMonthlyPrice}
              </p>
            </div>
            
            {/* Afficher les attributs du produit s'il s'agit d'une variante */}
            {isVariant && renderAttributeTags()}
            
            {/* Afficher les attributs de variation si c'est un parent */}
            {isParent && renderVariationAttributeTags()}
            
            <div className="mt-2 flex items-center space-x-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Disponible
              </Badge>
              
              {isParent && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
                  <Layers className="h-3 w-3 mr-1" />
                  {variantsCount} variante(s)
                </Badge>
              )}
              
              {isVariant && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Variante
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
