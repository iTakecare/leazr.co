
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import CatalogHeader from "@/components/catalog/management/CatalogHeader";
import CatalogContent from "@/components/catalog/management/CatalogContent";
import ViewModeToggle from "@/components/catalog/management/ViewModeToggle";
import GroupingOptions from "@/components/catalog/management/GroupingOptions";

const CatalogManagement = () => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [groupBy, setGroupBy] = useState<"category" | "brand" | null>(null);
  
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(),
    meta: {
      onError: (err: Error) => {
        console.error("Failed to fetch products:", err);
        toast.error("Erreur lors du chargement des produits");
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Erreur: {error instanceof Error ? error.message : "Une erreur s'est produite"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <CatalogHeader />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <Tabs defaultValue="catalog" className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="catalog">Catalogue</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="brands">Marques</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <GroupingOptions
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>
      
      <CatalogContent
        products={products || []}
        viewMode={viewMode}
        groupBy={groupBy}
      />
    </div>
  );
};

export default CatalogManagement;
