
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "@/services/catalogService";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useProductMapper } from "../products/useProductMapper";

export const useSafeCatalogManagement = () => {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mapDatabaseProductsToAppProducts } = useProductMapper();
  
  // Fetch products
  const { data: productsData = [], isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  
  // Ensure products are properly mapped to the correct type
  const products = mapDatabaseProductsToAppProducts(productsData);
  
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
