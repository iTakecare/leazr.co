
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
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Add additional logging to debug product data rendering
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[ProductCard] Rendering product:", product);
    }
  }, [product]);

  return (
    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
            <img 
              src={product.image_url || "/placeholder.svg"} 
              alt={product.name || "Produit"}
              className="object-contain h-20 w-20"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <div className="w-2/3 p-4">
            <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name || "Produit sans nom"}</h3>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Prix: {product.price !== undefined ? formatCurrency(product.price) : "Non défini"}
              </p>
              <p className="text-muted-foreground">
                Mensualité: {product.monthly_price !== undefined ? formatCurrency(product.monthly_price) : "Non définie"}
              </p>
            </div>
            <div className="mt-2 flex items-center">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Disponible
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
