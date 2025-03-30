
import React from "react";
import Container from "@/components/layout/Container";
import ProductEditor from "@/components/catalog/ProductEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award } from "lucide-react";
import BrandManager from "@/components/catalog/BrandManager";
import AttributeManager from "@/components/catalog/AttributeManager";
import CategoryManager from "@/components/catalog/CategoryManager";

// Import refactored components
import CatalogHeader from "@/components/catalog/management/CatalogHeader";
import ProductsViewOptions from "@/components/catalog/management/ProductsViewOptions";
import CatalogContent from "@/components/catalog/management/CatalogContent";
import { useCatalogManagement } from "@/hooks/catalog/useCatalogManagement";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  return (
    <Container>
      <div className="py-6 md:py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-start mobile-tabs-full">
            <TabsTrigger value="catalog">Catalogue</TabsTrigger>
            <TabsTrigger value="brands">
              <Award className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Marques" : <span>Marques</span>}
            </TabsTrigger>
            <TabsTrigger value="attributes">
              Attributs
            </TabsTrigger>
          </TabsList>
          
          {/* Tab content */}
          <TabsContent value="catalog">
            {/* Header - moved inside the TabsContent */}
            <CatalogHeader onAddNewProduct={handleAddNewProduct} />
            
            <div className="flex flex-col md:flex-row gap-6 mt-6">
              {/* Category sidebar - now as a vertical list on the left */}
              <div className="md:w-64 lg:w-72 flex-shrink-0 md:border-r pr-4 overflow-auto">
                <CategoryManager />
              </div>
              
              {/* Main content */}
              <div className="flex-1">
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
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="brands">
            <BrandManager />
          </TabsContent>
          
          <TabsContent value="attributes">
            <AttributeManager />
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
