
import React from "react";
import Container from "@/components/layout/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Folder, Download } from "lucide-react";
import BrandManager from "@/components/catalog/BrandManager";
import CategoryManager from "@/components/catalog/CategoryManager";

// Import refactored components
import CatalogHeader from "@/components/catalog/management/CatalogHeader";
import ProductsViewOptions from "@/components/catalog/management/ProductsViewOptions";
import CatalogContent from "@/components/catalog/management/CatalogContent";
import { useCatalogManagement } from "@/hooks/catalog/useCatalogManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

const CatalogManagement = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Use catalog management hook
  const {
    products,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    viewMode,
    groupingOption,
    setGroupingOption,
    onProductAdded,
    handleProductDeleted,
    handleViewModeChange
  } = useCatalogManagement();
  
  // Handle new product creation
  const handleAddNewProduct = () => {
    navigate("/catalog/form");
  };
  
  return (
    <Container>
      <div className="py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-start mobile-tabs-full">
            <TabsTrigger value="catalog">Catalogue</TabsTrigger>
            <TabsTrigger value="categories">
              <Folder className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Catégories" : <span>Catégories</span>}
            </TabsTrigger>
            <TabsTrigger value="brands">
              <Award className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Marques" : <span>Marques</span>}
            </TabsTrigger>
            <TabsTrigger value="import" onClick={() => navigate("/admin/catalog/import")}>
              <Download className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Import" : <span>Import</span>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="catalog">
            {/* Container for the header with limited width */}
            <div className="max-w-4xl mx-auto">
              <CatalogHeader onAddNewProduct={handleAddNewProduct} />
            </div>
            
            <div className="mt-6">
              <div className="w-full">
                <ProductsViewOptions 
                  groupingOption={groupingOption}
                  onGroupingChange={setGroupingOption}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                />
                
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
          
        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="brands">
          <BrandManager />
        </TabsContent>

        <TabsContent value="packs">
          <PackManager />
        </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
};

export default CatalogManagement;
