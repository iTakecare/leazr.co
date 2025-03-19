
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    monthly_price?: number;
    price?: number;
    category?: string;
    brand?: string;
    image_url?: string;
    variants?: Array<{
      monthly_price?: number;
      price?: number;
    }>;
    is_parent?: boolean;
  };
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  // Ensure we have valid data for display
  const productName = product?.name || "Produit sans nom";
  const productPrice = product?.price !== undefined ? formatCurrency(product.price) : "Non défini";
  
  // Calculate minimum monthly price from variants if they exist
  let productMonthlyPrice = "Non définie";
  let hasVariants = false;
  
  if (product?.monthly_price) {
    productMonthlyPrice = formatCurrency(product.monthly_price);
  } 
  
  if (product?.variants && product.variants.length > 0) {
    hasVariants = true;
    const variantPrices = product.variants
      .map(variant => variant.monthly_price || 0)
      .filter(price => price > 0);
      
    if (variantPrices.length > 0) {
      const minPrice = Math.min(...variantPrices);
      if (!product.monthly_price || minPrice < product.monthly_price) {
        productMonthlyPrice = formatCurrency(minPrice);
      }
    }
  }
  
  const productImage = product?.image_url || "/placeholder.svg";
  
  // Debug log for variant detection
  console.log(`ProductCard ${product.id}: is_parent=${product.is_parent}, variants=${product?.variants?.length || 0}`);

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
            <div className="mt-2 flex items-center">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Disponible
              </span>
              {hasVariants && (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Options
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
