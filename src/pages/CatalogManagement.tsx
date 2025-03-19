
import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { deleteAllProducts, deleteProduct, getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Plus, Trash2, Tag, Award, List, Grid3X3, Layers, Settings } from "lucide-react";
import ProductEditor from "@/components/catalog/ProductEditor";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import CategoryManager from "@/components/catalog/CategoryManager";
import BrandManager from "@/components/catalog/BrandManager";
import AttributeManager from "@/components/catalog/AttributeManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccordionProductList from "@/components/catalog/AccordionProductList";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ProductGrid from "@/components/catalog/ProductGrid";
import { useIsMobile } from "@/hooks/use-mobile";

const CatalogManagement = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  
  const { data: products = [], refetch, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  useEffect(() => {
    console.log(`Loaded ${products.length} products:`, products);
  }, [products]);

  useEffect(() => {
    if (!isLoading && products.length === 0) {
      console.log("No products found, loading sample data would go here");
      // This is where you could load sample data if needed
    }
  }, [isLoading, products]);

  const deleteAllProductsMutation = useMutation({
    mutationFn: deleteAllProducts,
    onSuccess: () => {
      refetch();
      toast.success("Tous les produits ont été supprimés");
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la suppression des produits:", err);
      toast.error("Impossible de supprimer tous les produits");
    }
  });

  const onProductAdded = () => {
    setIsAddProductOpen(false);
    refetch();
    toast.success("Produit ajouté avec succès");
  };

  const handleDeleteAllProducts = () => {
    deleteAllProductsMutation.mutate();
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const handleProductDeleted = () => {
    refetch();
  };

  const handleAddNewProduct = () => {
    navigate("/catalog/create-product");
  };

  const handleViewModeChange = (value: string) => {
    if (value === "grid" || value === "accordion") {
      setViewMode(value);
    }
  };
  
  return (
    <Container>
      <div className="py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion Catalogue</h1>
          <div className="flex gap-2">
            <Button onClick={handleAddNewProduct} className="flex-1 sm:flex-initial">
              <Plus className="mr-2 h-4 w-4" /> {isMobile ? "Ajouter" : "Ajouter un produit"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1 sm:flex-initial">
                  <Trash2 className="mr-2 h-4 w-4" /> {isMobile ? "Supprimer tout" : "Supprimer tous les produits"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer tous les produits du catalogue? Cette action ne peut pas être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllProducts}>
                    Supprimer tous les produits
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-start mobile-tabs-full">
            <TabsTrigger value="catalog">Catalogue</TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Catégories" : <span>Catégories</span>}
            </TabsTrigger>
            <TabsTrigger value="brands">
              <Award className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Marques" : <span>Marques</span>}
            </TabsTrigger>
            <TabsTrigger value="attributes">
              <Settings className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Attributs" : <span>Attributs</span>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="catalog">
            {error ? (
              <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4">
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
                ) : viewMode === "accordion" ? (
                  <AccordionProductList 
                    products={products} 
                    onProductDeleted={handleProductDeleted} 
                    groupingOption={groupingOption} 
                  />
                ) : (
                  <ProductGrid products={products} />
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>
          
          <TabsContent value="brands">
            <BrandManager />
          </TabsContent>
          
          <TabsContent value="attributes">
            <AttributeManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Garder le ProductEditor comme solution de repli ou d'édition rapide */}
      <ProductEditor 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={onProductAdded}
      />
    </Container>
  );
};

export default CatalogManagement;
