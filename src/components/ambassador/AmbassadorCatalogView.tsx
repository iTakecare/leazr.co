import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProductSelector } from "@/hooks/products/useProductSelector";
import { useProductFilter } from "@/hooks/products/useProductFilter";
import CatalogProductCard from "@/components/ui/CatalogProductCard";
import { Skeleton } from "@/components/ui/skeleton";

const AmbassadorCatalogView: React.FC = () => {
  const navigate = useNavigate();
  const { products, isLoading, error } = useProductSelector(true);
  
  const {
    searchQuery,
    setSearchQuery,
    filteredProducts,
  } = useProductFilter(products);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/ambassador/catalog/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-destructive">Une erreur est survenue lors du chargement des produits</p>
      </div>
    );
  }

  if (!filteredProducts || filteredProducts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col items-center justify-center h-64 border rounded-md p-6">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-xl font-medium mb-2">Aucun produit trouvé</p>
          <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un produit..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {filteredProducts.map((product) => (
          <motion.div 
            key={product.id} 
            variants={itemVariants}
            onClick={() => handleProductClick(product.id)}
            className="cursor-pointer"
          >
            <CatalogProductCard 
              product={product} 
              onClick={() => handleProductClick(product.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default AmbassadorCatalogView;