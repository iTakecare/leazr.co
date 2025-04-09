
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

  // Ajout d'un logging plus détaillé pour diagnostiquer le problème
  console.log("ProductGrid: Received products:", products.length);
  products.forEach((product, index) => {
    console.log(`ProductGrid: Product ${index + 1}: ${product.name} (${product.id})`);
    console.log(`ProductGrid: - has_variants: ${product.is_parent || (product.variant_combination_prices && product.variant_combination_prices.length > 0)}`);
    console.log(`ProductGrid: - is_variation: ${product.is_variation}`);
    console.log(`ProductGrid: - parent_id: ${product.parent_id}`);
    console.log(`ProductGrid: - price: ${product.price}, monthly_price: ${product.monthly_price}`);
  });

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

  // Filtrer les produits pour exclure les variations directement ici
  const displayProducts = products.filter(product => !product.is_variation);
  
  console.log(`ProductGrid: Final display products count: ${displayProducts.length}`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {displayProducts.map((product, index) => (
        <motion.div key={product.id} variants={itemVariants}>
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
