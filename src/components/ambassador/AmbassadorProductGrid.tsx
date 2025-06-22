
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import CatalogProductCard from "@/components/ui/CatalogProductCard";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 pb-24">
      {products.map((product) => (
        <motion.div 
          key={product.id} 
          variants={itemVariants}
          onClick={() => handleProductClick(product.id)}
        >
          <CatalogProductCard 
            product={product} 
            onClick={() => handleProductClick(product.id)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default AmbassadorProductGrid;
