
import React from "react";
import { cn } from "@/lib/utils";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isSelected?: boolean;
  className?: string;
}

const ProductCard = ({
  product,
  onSelect,
  isSelected = false,
  className,
}: ProductCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50",
        className
      )}
      onClick={() => onSelect(product)}
    >
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium line-clamp-1">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
          {product.category}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-semibold">Prix d'achat: {product.monthly_price ? formatCurrency(product.monthly_price) : "-"}</p>
            <p className="text-sm text-muted-foreground">
              Mensualité: {product.price ? formatCurrency(product.price) + "/mois" : "-"}
            </p>
          </div>
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
      )}
    </motion.div>
  );
};

export default ProductCard;
