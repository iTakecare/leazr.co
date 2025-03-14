
import React from "react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { AlertCircle, Tag, ImageIcon } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun produit trouvé</p>
        <p className="text-xs text-muted-foreground mt-2">
          Importez des produits via WooCommerce ou ajoutez-en manuellement
        </p>
      </div>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    console.log("Image failed to load:", target.src);
    target.src = "/placeholder.svg";
    target.onerror = null; // Prevent infinite loop
  };

  // Function to get alt text or generate fallback
  const getImageAlt = (product: Product): string => {
    return product.name || 'Product image';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <Link
            to={`/products/${product.id}`}
            className="group block border rounded-md overflow-hidden transition-all hover:shadow-md h-full flex flex-col"
          >
            <div className="aspect-square bg-muted overflow-hidden relative">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={getImageAlt(product)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={handleImageError}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune image</p>
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-medium truncate">{product.name}</h3>
              
              <div className="flex flex-wrap gap-1 mt-1 mb-2">
                {product.category && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <Tag className="mr-1 h-3 w-3" />
                    {product.category}
                  </span>
                )}
                {product.brand && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {product.brand}
                  </span>
                )}
              </div>
              
              {product.sku && (
                <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
              )}
              
              <div className="mt-auto pt-2 flex flex-col">
                <p className="font-bold text-primary">
                  Mensualité: {formatCurrency(product.monthly_price || (product.price * 0.033))}/mois
                </p>
                <p className="text-sm text-muted-foreground">
                  Prix d'achat: {formatCurrency(product.price)}
                </p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default ProductGrid;
