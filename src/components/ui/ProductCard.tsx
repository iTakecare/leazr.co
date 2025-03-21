
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

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
}

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  if (!product) return null;
  
  // Ensure we have valid data for display
  const productName = product?.name || "Produit sans nom";
  const productBrand = product?.brand || "";
  
  // Calculate minimum monthly price from variants if they exist
  let productMonthlyPrice: string | number = "Non définie";
  let productPrice: string | number = product?.price || 0;
  let hasVariants = false;
  
  // Check if the product has variation attributes defined
  const hasVariationAttributes = product.variation_attributes && 
    Object.keys(product.variation_attributes).length > 0;
  
  // Format the main product price
  if (typeof productPrice === 'number') {
    productPrice = formatCurrency(productPrice);
  }
  
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
  
  const productImage = product?.image_url || "/placeholder.svg";
  
  // Determine the badge type
  const getBadgeType = () => {
    if (hasVariationAttributes) return "info";
    if (product.is_parent) return "success";
    if (product.attributes && Object.keys(product.attributes).length > 0) return "secondary";
    return "default";
  };
  
  // Determine badge text
  const getBadgeText = () => {
    if (hasVariationAttributes) {
      const attributeCount = Object.keys(product.variation_attributes || {}).length;
      return `${attributeCount} attribut(s)`;
    }
    if (product.is_parent) return "Produit parent";
    if (product.attributes && Object.keys(product.attributes).length > 0) return "Variante";
    return "Produit standard";
  };

  // Format attributes for display
  const formatAttributes = (attributes?: Record<string, any>) => {
    if (!attributes || Object.keys(attributes).length === 0) return null;
    
    return (
      <div className="mt-1">
        {Object.entries(attributes).map(([key, value]) => (
          <Badge key={key} variant="outline" className="mr-1 mb-1 text-xs">
            {key}: {value}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white" 
      onClick={onClick}
    >
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
            {productBrand && <p className="text-xs text-gray-500 mb-2">{productBrand}</p>}
            
            {/* Show attributes if this is a variant product */}
            {product.attributes && formatAttributes(product.attributes)}
            
            <div className="text-sm space-y-1 mt-2">
              <p className="text-muted-foreground">
                Prix: {productPrice}
              </p>
              <p className="text-muted-foreground">
                {hasVariants ? "À partir de " : "Mensualité: "}{productMonthlyPrice}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={getBadgeType() as any} className="text-xs">
                {getBadgeText()}
              </Badge>
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category}
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
