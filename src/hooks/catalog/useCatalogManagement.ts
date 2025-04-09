import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "@/services/catalogService";
import { useState } from "react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

export const useCatalogManagement = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { 
    data: products = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["products", true],
    queryFn: getProducts,
  });

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "accordion">("accordion");
  const [groupingOption, setGroupingOption] = useState<"model" | "brand">("model");
  
  const navigate = useNavigate();
  
  // Enhanced products processing with better variant detection
  const productsData = React.useMemo(() => {
    return products;
  }, [products]);
  
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
    products: productsData,
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
