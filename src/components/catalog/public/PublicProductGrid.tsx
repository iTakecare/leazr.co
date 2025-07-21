
import React from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";

interface PublicProductGridProps {
  products: Product[];
}

const PublicProductGrid: React.FC<PublicProductGridProps> = ({ products }) => {
  const navigate = useNavigate();
  const { companyId, companySlug } = useCompanyDetection();
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleProductClick = (product: Product) => {
    console.log('🎯 PUBLIC PRODUCT GRID - Product clicked:', {
      productId: product.id,
      productName: product.name,
      companySlug,
      companyId
    });

    // Navigate based on context - slug-based takes priority
    if (companySlug) {
      const targetUrl = `/${companySlug}/products/${product.id}`;
      console.log('🎯 Navigating to slug-based URL:', targetUrl);
      navigate(targetUrl);
    } else if (companyId) {
      const targetUrl = `/public/${companyId}/products/${product.id}`;
      console.log('🎯 Navigating to company-id-based URL:', targetUrl);
      navigate(targetUrl);
    } else {
      console.error('🎯 No valid navigation context found');
    }
  };

  if (!products) {
    console.error("PublicProductGrid: products prop is undefined");
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Une erreur s'est produite lors du chargement des produits
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    console.log("PublicProductGrid: empty products array");
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Le catalogue est actuellement vide
        </p>
      </div>
    );
  }

  console.log(`PublicProductGrid: Rendering ${products.length} products`);
  products.forEach((product, index) => {
    console.log(`PublicProductGrid product ${index + 1}: ${product.name} (ID: ${product.id})`);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductGridCard 
            product={product} 
            onClick={() => handleProductClick(product)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default PublicProductGrid;
