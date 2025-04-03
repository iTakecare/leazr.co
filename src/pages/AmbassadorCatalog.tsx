
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { getProducts } from "@/services/catalogService";
import { List, Grid3X3, Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import AccordionProductList from "@/components/catalog/AccordionProductList";
import AmbassadorProductGrid from "@/components/ambassador/AmbassadorProductGrid";

const AmbassadorCatalog = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("grid");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const handleViewModeChange = (value: string) => {
    if (value === "grid" || value === "accordion") {
      setViewMode(value);
    }
  };
  
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
        className="py-6 md:py-8"
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
          
          <div className="flex items-center space-x-2 self-end">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={handleViewModeChange}
              className="bg-background"
            >
              <ToggleGroupItem value="accordion" aria-label="Voir en liste">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Voir en grille">
                <Grid3X3 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {viewMode === "grid" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-md w-full sm:w-auto">
              <Button 
                variant={groupingOption === "model" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setGroupingOption("model")}
                className="rounded-md flex-1 sm:flex-initial"
              >
                Par modèle
              </Button>
              <Button 
                variant={groupingOption === "brand" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setGroupingOption("brand")}
                className="rounded-md flex-1 sm:flex-initial"
              >
                Par marque
              </Button>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${viewMode === 'grid' ? 'h-64' : 'h-20'} rounded-md bg-muted animate-pulse`} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-xl font-medium mb-2">Aucun produit trouvé</p>
            <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : viewMode === "accordion" ? (
          <AccordionProductList 
            products={filteredProducts} 
            onProductDeleted={null}
            groupingOption={groupingOption}
            readOnly={true}
          />
        ) : (
          <AmbassadorProductGrid products={filteredProducts} />
        )}
      </motion.div>
    </Container>
  );
};

export default AmbassadorCatalog;
