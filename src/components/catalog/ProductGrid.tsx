
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { AlertCircle, Tag, ImageIcon } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2">
          Importez des produits via WooCommerce ou ajoutez-en manuellement
        </p>
      </div>
    );
  }

  console.log("Rendering products grid with", products.length, "products");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
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
