
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";

interface ProductGridProps {
  products: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-md">
        <p className="text-muted-foreground">Aucun produit trouvé</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <Link
            to={`/catalog/${product.id}`}
            className="group block border rounded-md overflow-hidden transition-all hover:shadow-md"
          >
            <div className="aspect-square bg-muted overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">Aucune image</p>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground mb-2 truncate">{product.category}</p>
              <p className="font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default ProductGrid;
