import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { generateSlug } from "@/utils/slugs";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import AmbassadorProductCard from "./AmbassadorProductCard";
import { Product } from "@/types/catalog";

interface AmbassadorProductGridProps {
  products: Product[];
}

const AmbassadorProductGrid: React.FC<AmbassadorProductGridProps> = ({ products }) => {
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();

  const handleProductClick = (product: Product) => {
    const productSlug = generateSlug(product.name);
    
    // Navigate to product detail page within ambassador context
    navigate(`/ambassador/products/${product.id}-${productSlug}`);
  };

  // Handle case where products is undefined or null
  if (!products) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des produits...</p>
      </div>
    );
  }

  // Handle empty products array
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucun produit trouvé
          </h3>
          <p className="text-muted-foreground">
            Aucun produit ne correspond aux critères de recherche actuels.
            Essayez d'ajuster vos filtres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <AmbassadorProductCard
            product={product}
            onClick={() => handleProductClick(product)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default AmbassadorProductGrid;