
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { getProducts } from "@/services/catalogService";
import { List, Grid3X3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccordionProductList from "@/components/catalog/AccordionProductList";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ProductGrid from "@/components/catalog/ProductGrid";
import { useIsMobile } from "@/hooks/use-mobile";

const AmbassadorCatalog = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"category" | "brand">("category");
  
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const handleViewModeChange = (value: string) => {
    if (value === "grid" || value === "accordion") {
      setViewMode(value);
    }
  };
  
  return (
    <Container>
      <div className="py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Catalogue</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-md w-full sm:w-auto">
            <Button 
              variant={groupingOption === "category" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setGroupingOption("category")}
              className="rounded-md flex-1 sm:flex-initial"
            >
              Par catégorie
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
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
          </div>
        ) : viewMode === "accordion" ? (
          <AccordionProductList 
            products={products} 
            groupingOption={groupingOption}
            readOnly={true}
            onEdit={(id) => console.log(id)}
            onDelete={(id) => console.log(id)}
          />
        ) : (
          <ProductGrid 
            products={products} 
            groupBy={groupingOption}
            readOnly={true}
          />
        )}
      </div>
    </Container>
  );
};

export default AmbassadorCatalog;
