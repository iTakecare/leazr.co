
import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, AlertCircle } from "lucide-react";
import { Product } from "@/types/catalog";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import ProductCard from "./ProductCard";

// Map for translating category names to French
const categoryTranslations: Record<string, string> = {
  "all": "Tous",
  "laptop": "Ordinateur portable",
  "desktop": "Ordinateur de bureau",
  "tablet": "Tablette",
  "smartphone": "Smartphone",
  "accessories": "Accessoires",
  "printer": "Imprimante",
  "monitor": "Écran",
  "software": "Logiciel",
  "networking": "Réseau",
  "server": "Serveur",
  "storage": "Stockage",
  "other": "Autre"
};

// Helper function to translate categories
const translateCategory = (category: string): string => {
  return categoryTranslations[category?.toLowerCase()] || category;
};

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  isSheet?: boolean; // New prop to determine if we should use Sheet component
  title?: string; // Optional title override
  description?: string; // Optional description override
}

const ProductCatalog = ({ 
  isOpen, 
  onClose, 
  onSelectProduct, 
  isSheet = true, // Default to Sheet view (for client requests)
  title = "Catalogue de produits",
  description = "Sélectionnez un produit pour l'ajouter à votre offre"
}: ProductCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  console.log("ProductCatalog opened:", isOpen);

  // Fetch products from the server with better error handling
  const { 
    data: products = [], 
    isLoading, 
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        console.log("Fetching products for catalog...");
        const productsData = await getProducts();
        console.log(`Retrieved ${productsData.length} products for catalog`);
        
        // Fallback to mock data if API returns empty array
        if (productsData.length === 0) {
          console.log("No products found, using fallback data");
          // Import the mock data
          const { products: mockProducts } = await import("@/data/products");
          toast.info("Utilisation des données de démonstration", {
            description: "Les produits affichés sont des exemples",
            duration: 5000,
          });
          return mockProducts;
        }
        
        return productsData;
      } catch (error) {
        console.error("Error fetching products:", error);
        console.log("Timeout atteint, utilisation des données mockées");
        // Import the mock data
        const { products: mockProducts } = await import("@/data/products");
        toast.error("Impossible de charger les produits depuis le serveur", {
          description: "Utilisation des données de démonstration",
          duration: 5000,
        });
        return mockProducts;
      }
    },
    enabled: isOpen || !isSheet, // Load data when catalog is open OR when not in sheet mode
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3, // Retry 3 times if the request fails
  });
  
  // Filter products based on search term and category
  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);
  
  // Reset search and category when closing
  useEffect(() => {
    if (!isOpen && isSheet) {
      setSearchTerm("");
      setSelectedCategory("all");
    } else if (isOpen || !isSheet) {
      // Force refetch when opened or when in page mode
      refetch();
    }
  }, [isOpen, isSheet, refetch]);

  // The catalog content (search, categories, product grid)
  const CatalogContent = () => (
    <div className="mt-6 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {isError && (
        <Alert variant="destructive" className="my-2">
          <AlertCircle className="h-4 w-4" />
          <p className="ml-2">Erreur lors du chargement des produits. Utilisation des données de démonstration.</p>
        </Alert>
      )}
      
      <div className="flex flex-wrap gap-2">
        {React.useMemo(() => {
          const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
          return categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === "all" ? "Tous" : translateCategory(category)}
            </Button>
          ));
        }, [products, selectedCategory])}
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 h-[200px] animate-pulse bg-muted"></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="cursor-pointer"
                onClick={() => onSelectProduct(product)}
              >
                <ProductCard 
                  product={product} 
                  onClick={() => onSelectProduct(product)} 
                />
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center">
              <p className="text-muted-foreground">Aucun produit trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  // Render as Sheet or regular page content
  return isSheet ? (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {description}
          </SheetDescription>
        </SheetHeader>
        <CatalogContent />
      </SheetContent>
    </Sheet>
  ) : (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground mb-6">{description}</p>
      <CatalogContent />
    </div>
  );
};

export default ProductCatalog;
