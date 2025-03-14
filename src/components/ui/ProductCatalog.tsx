
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
}

const ProductCatalog = ({ isOpen, onClose, onSelectProduct }: ProductCatalogProps) => {
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
        console.log("Fetching products for client catalog...");
        const productsData = await getProducts();
        console.log(`Retrieved ${productsData.length} products for client catalog`);
        
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
    enabled: isOpen, // Only load data when the catalog is open
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3, // Retry 3 times if the request fails
  });
  
  console.log("Products from server:", products.length);
  if (error) console.error("Error loading products:", error);
  
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
  
  console.log("Filtered products:", filteredProducts.length);
  
  const handleSelectProduct = (product: Product) => {
    console.log("Selected product:", product.name);
    onSelectProduct(product);
    onClose();
  };
  
  // Reset search and category when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedCategory("all");
    } else {
      // Force refetch when opened
      refetch();
    }
  }, [isOpen, refetch]);
  
  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Catalogue de produits</SheetTitle>
          <SheetDescription>
            Sélectionnez un produit pour l'ajouter à votre offre
          </SheetDescription>
        </SheetHeader>

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
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 h-[200px] animate-pulse bg-muted"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -5 }}
                    className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted mb-3 rounded-md">
                      <img
                        src={product.image_url || product.imageUrl || '/placeholder.svg'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h3 className="font-medium line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{translateCategory(product.category || 'other')}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold">
                          {(product.price || 0)?.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mensualité: {(product.monthly_price || 0)?.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}/mois
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center">
                  <p className="text-muted-foreground">Aucun produit trouvé</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductCatalog;
