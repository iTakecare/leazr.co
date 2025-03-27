
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useCatalogManagement = () => {
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand" | "category">("category");
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  
  const handleProductAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Produit ajouté avec succès");
  };
  
  const handleProductDeleted = async (productId: string) => {
    try {
      // Supprimer le produit de manière optimiste en frontend d'abord
      queryClient.setQueryData(["products"], (oldData: Product[]) => {
        return oldData.filter((product) => product.id !== productId);
      });
      
      // En réalité, on enverrait une requête API pour supprimer le produit
      // await deleteProduct(productId);
      
      toast.success("Produit supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Erreur lors de la suppression du produit:", error);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.error("Erreur lors de la suppression du produit");
    }
  };
  
  const handleAddNewProduct = () => {
    navigate('/catalog/create-product');
  };

  const handleViewModeChange = (mode: "grid" | "accordion") => {
    setViewMode(mode);
  };
  
  return {
    products,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    viewMode,
    groupingOption,
    setGroupingOption,
    onProductAdded: handleProductAdded,
    handleProductDeleted,
    handleAddNewProduct,
    handleViewModeChange
  };
};
