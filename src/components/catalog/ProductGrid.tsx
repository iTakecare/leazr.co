
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const isMobile = useIsMobile();
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Importez des produits via WooCommerce ou ajoutez-en manuellement
        </p>
      </div>
    );
  }

  console.log("Rendering products grid with", products.length, "products");
  
  // Vérifier que chaque produit a un ID unique avant de les afficher
  const validProducts = products.filter(product => product && product.id);
  console.log("Valid products count:", validProducts.length);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {validProducts.map((product) => (
        <motion.div key={product.id} variants={itemVariants} initial="hidden" animate="visible">
          <Link
            to={`/products/${product.id}`}
            className="block h-full"
          >
            <ProductCard product={product} />
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default ProductGrid;
