
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { deleteProduct, getProducts } from "@/services/catalogService";
import { toast } from "@/components/ui/use-toast";

export const useCatalogManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  
  // Fetch products
  const { data: products = [], refetch, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Succès",
        description: "Le produit a été supprimé",
        variant: "default",
      });
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la suppression du produit:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  });

  // Effect to log products
  useEffect(() => {
    console.log(`Loaded ${products.length} products:`, products);
  }, [products]);

  // Effect to check if no products found
  useEffect(() => {
    if (!isLoading && products.length === 0) {
      console.log("No products found, loading sample data would go here");
      // This is where you could load sample data if needed
    }
  }, [isLoading, products]);

  // Product added callback
  const onProductAdded = () => {
    setIsAddProductOpen(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({
      title: "Succès",
      description: "Produit ajouté avec succès",
      variant: "default",
    });
  };

  // Select product handler
  const handleSelectProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // Delete product handler
  const handleProductDeleted = async (productId: string) => {
    try {
      await deleteProductMutation.mutateAsync(productId);
      return Promise.resolve();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      return Promise.reject(error);
    }
  };

  // Add new product handler
  const handleAddNewProduct = () => {
    navigate("/catalog/create-product");
  };

  // View mode change handler
  const handleViewModeChange = (value: string) => {
    if (value === "grid" || value === "accordion") {
      setViewMode(value);
    }
  };
  
  return {
    products,
    isLoading,
    error,
    isAddProductOpen,
    setIsAddProductOpen,
    activeTab,
    setActiveTab,
    viewMode,
    groupingOption,
    setGroupingOption,
    onProductAdded,
    handleSelectProduct,
    handleProductDeleted,
    handleAddNewProduct,
    handleViewModeChange
  };
};
