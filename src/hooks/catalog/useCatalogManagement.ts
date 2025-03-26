
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "@/services/catalogService";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

export const useCatalogManagement = () => {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch products
  const { data: productsData = [], isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  
  // Process products data to add variants information
  const products = React.useMemo(() => {
    // Add debug logging
    console.log("Processing products in useCatalogManagement:", productsData.length);
    console.log("Products with variants:", productsData.filter(p => 
      p.is_parent || 
      (p.variant_combination_prices && p.variant_combination_prices.length > 0) ||
      (p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0)
    ).length);
    
    return productsData;
  }, [productsData]);
  
  // Handle adding a new product
  const handleAddNewProduct = () => {
    setIsAddProductOpen(true);
  };
  
  // Handle successful product addition
  const onProductAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Produit ajouté avec succès");
  };
  
  // Handle product deletion
  const handleProductDeleted = async (productId: string) => {
    try {
      await deleteProduct(productId);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé avec succès");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression du produit");
    }
  };
  
  // Handle view mode change
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
    handleProductDeleted,
    handleAddNewProduct,
    handleViewModeChange
  };
};
