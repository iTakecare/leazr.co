
import React, { useEffect } from "react";
import Container from "@/components/layout/Container";
import ProductEditor from "@/components/catalog/ProductEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Award } from "lucide-react";
import CategoryManager from "@/components/catalog/CategoryManager";
import BrandManager from "@/components/catalog/BrandManager";

// Import refactored components
import CatalogHeader from "@/components/catalog/management/CatalogHeader";
import ProductsViewOptions from "@/components/catalog/management/ProductsViewOptions";
import CatalogContent from "@/components/catalog/management/CatalogContent";
import { useCatalogManagement } from "@/hooks/catalog/useCatalogManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { ensureStorageBucket } from "@/services/storageService";
import { toast } from "sonner";

const CatalogManagement = () => {
  const isMobile = useIsMobile();
  
  // Use catalog management hook
  const {
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
  } = useCatalogManagement();
  
  // Ensure product-images bucket exists when component mounts
  useEffect(() => {
    const initializeProductImagesBucket = async () => {
      try {
        const bucketExists = await ensureStorageBucket('product-images');
        if (bucketExists) {
          console.log('Product images bucket is ready');
        } else {
          console.error('Failed to create or verify product-images bucket');
          toast.error('Erreur lors de la vérification du stockage des images produit');
        }
      } catch (error) {
        console.error('Error initializing product images bucket:', error);
      }
    };
    
    initializeProductImagesBucket();
  }, []);
  
  return (
    <Container>
      <div className="py-6 md:py-8">
        {/* Header */}
        <CatalogHeader onAddNewProduct={handleAddNewProduct} />

        {/* Tabs */}
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
          </TabsList>
          
          {/* Tab content */}
          <TabsContent value="catalog">
            {/* View options */}
            <ProductsViewOptions 
              groupingOption={groupingOption}
              onGroupingChange={setGroupingOption}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
            
            {/* Catalog content */}
            <CatalogContent 
              products={products}
              isLoading={isLoading}
              error={error}
              viewMode={viewMode}
              groupingOption={groupingOption}
              onProductDeleted={handleProductDeleted}
            />
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>
          
          <TabsContent value="brands">
            <BrandManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Product editor dialog */}
      <ProductEditor 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={onProductAdded}
      />
    </Container>
  );
};

export default CatalogManagement;
