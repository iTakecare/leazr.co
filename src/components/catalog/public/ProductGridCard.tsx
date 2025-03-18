
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";

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

  // Determine if product has variants
  const hasVariants = product.variants?.length > 0 || (product.is_parent && product.variants?.length > 0);

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border-0 shadow-sm rounded-xl"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-gray-50 flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="object-contain max-h-full max-w-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>
      
      <CardContent className="flex-1 flex flex-col p-5 pt-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {product.category && (
            <Badge className="bg-indigo-500 text-white hover:bg-indigo-600 rounded-full font-normal">
              {getCategoryLabel(product.category)}
            </Badge>
          )}
          {brandLabel && (
            <Badge variant="outline" className="rounded-full font-normal text-gray-600 bg-gray-50">
              {brandLabel}
            </Badge>
          )}
        </div>
        
        <h3 className="font-bold text-navy-900 text-xl mb-1 line-clamp-2">{product.name}</h3>
        
        <div className="text-gray-700 text-base">
          à partir de <span className="font-bold text-indigo-700">{monthlyPrice}</span>
        </div>
        
        {hasVariants && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-600 text-sm">Sélectionnez votre configuration idéale.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;
