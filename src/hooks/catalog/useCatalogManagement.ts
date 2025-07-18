import { useState, useMemo } from "react";
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
  
  // Fetch products with forced refresh on mount
  const { data: productsData = [], isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(true), // Pass true to include admin-only products
    staleTime: 0, // Force refresh
    gcTime: 0, // Don't cache (gcTime replaces cacheTime in React Query v5)
  });
  
  // Enhanced products processing with better variant detection
  const products = useMemo(() => {
    // Add debug logging
    console.log("Processing products in useCatalogManagement:", productsData.length);
    
    // Check each product for variants
    
    return productsData.map(product => {
      // Determine if this product has variants or is a variant
      const isParent = product.is_parent || 
                       (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
                       (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0);
                       
      // Count variants if this is a parent product
      const variantCount = product.variant_combination_prices?.length || 0;
      
      return {
        ...product,
        is_parent: isParent
      };
    });
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
