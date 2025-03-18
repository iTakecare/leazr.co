
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";

interface ProductGridCardProps {
  product: Product;
  onClick: () => void;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, onClick }) => {
  const brandLabel = product.brand || "Generic";
  const monthlyPrice = product.monthly_price ? `${formatCurrency(product.monthly_price)}/mois` : "Prix sur demande";
  const imageUrl = product.image_url || product.imageUrl || "/placeholder.svg";
  
  // Determine the appropriate category label
  const getCategoryLabel = (category: string | undefined) => {
    if (!category) return "Autre";
    
    const categoryMap: Record<string, string> = {
      laptop: "Ordinateur portable",
      desktop: "Ordinateur fixe",
      tablet: "Tablette",
      smartphone: "Smartphone",
      monitor: "Écran",
      printer: "Imprimante",
      accessories: "Accessoire"
    };
    
    return categoryMap[category] || "Autre";
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-gray-100 flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="object-contain max-h-full max-w-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        {product.category && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {getCategoryLabel(product.category)}
            </span>
          </div>
        )}
      </div>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="text-sm text-gray-500 mb-1">{brandLabel}</div>
        <h3 className="font-medium text-lg mb-1 line-clamp-2">{product.name}</h3>
        
        <div className="mt-auto pt-4">
          <div className="text-sm text-gray-500">dès</div>
          <div className="text-lg font-bold text-indigo-700">{monthlyPrice}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
