
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { motion } from "framer-motion";
import { Plus, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Handle image array access based on what's available
  // Support both imageUrls (type definition) and image_urls (database schema)
  const images = (product.image_urls && product.image_urls.length) 
    ? [product.imageUrl, ...product.image_urls]
    : (product.imageUrls && product.imageUrls.length)
      ? [product.imageUrl, ...product.imageUrls]
      : [product.imageUrl];
  
  // Filter out any undefined or empty image URLs
  const validImages = images.filter(img => img);
  
  // Get current alt text or fallback to product name if not available
  const getCurrentAltText = () => {
    return `${product.name} - ${product.category || 'product'}`;
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    console.log("Image failed to load:", target.src);
    target.onerror = null; // Prevent infinite loop
    target.src = "/placeholder.svg";
  };
  
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };
  
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

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
      <div className="aspect-square w-full overflow-hidden bg-muted relative">
        {validImages.length > 0 ? (
          <>
            <img
              src={validImages[currentImageIndex]}
              alt={getCurrentAltText()}
              className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
              loading="lazy"
              onError={handleImageError}
            />
            
            {validImages.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {validImages.map((_, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full", 
                        currentImageIndex === index 
                          ? "bg-white" 
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium line-clamp-1">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
          {product.category}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-semibold">Mensualité: {product.monthly_price ? formatCurrency(product.monthly_price) + "/mois" : "-"}</p>
            <p className="text-sm text-muted-foreground">
              Prix d'achat: {product.price ? formatCurrency(product.price) : "-"}
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
