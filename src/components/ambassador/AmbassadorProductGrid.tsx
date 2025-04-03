
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

interface AmbassadorProductGridProps {
  products: Product[];
}

const AmbassadorProductGrid: React.FC<AmbassadorProductGridProps> = ({ products }) => {
  const navigate = useNavigate();
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
      </div>
    );
  }

  const handleProductClick = (productId: string) => {
    navigate(`/ambassador/catalog/${productId}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => {
        // Check if product has variants
        const hasVariants = product.is_parent || 
          (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
          (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0);
        
        // Count variants
        const variantsCount = hasVariants ? 
          (product.variants_count || product.variant_combination_prices?.length || 0) : 0;
        
        return (
          <motion.div 
            key={product.id} 
            variants={itemVariants}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleProductClick(product.id)}
          >
            <div className="aspect-square bg-gray-50 p-2 flex items-center justify-center overflow-hidden">
              <img 
                src={product.image_url || '/placeholder.svg'} 
                alt={product.name}
                className="object-contain w-full h-full transition-transform hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>
            
            <div className="p-4">
              {product.brand && (
                <p className="text-xs text-gray-500">{product.brand}</p>
              )}
              
              <h3 className="font-medium line-clamp-2 mb-2 hover:text-blue-600 transition-colors">
                {product.name}
              </h3>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {product.category && (
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                )}
                
                {hasVariants && variantsCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {variantsCount} config{variantsCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="mt-auto pt-2 border-t border-gray-100">
                {product.monthly_price ? (
                  <p className="text-blue-600 font-semibold">
                    {hasVariants ? "À partir de " : ""}
                    {formatCurrency(product.monthly_price)}
                    <span className="text-xs font-normal text-gray-500"> /mois</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Prix sur demande</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AmbassadorProductGrid;
