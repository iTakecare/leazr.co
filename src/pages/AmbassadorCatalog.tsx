
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { getProducts } from "@/services/catalogService";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import AmbassadorProductGrid from "@/components/ambassador/AmbassadorProductGrid";
import { ScrollArea } from "@/components/ui/scroll-area";

const AmbassadorCatalog = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(true), // Ambassador can see admin-only products
  });
  
  const filteredProducts = searchQuery
    ? products.filter(product => 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;
    
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  return (
    <Container>
      <motion.div 
        className="py-6 md:py-8 flex flex-col h-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Catalogue Produits</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
              Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg m-4">
              <p className="text-xl font-medium mb-2">Aucun produit trouvé</p>
              <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="px-4">
              <AmbassadorProductGrid products={filteredProducts} />
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </Container>
  );
};

export default AmbassadorCatalog;
