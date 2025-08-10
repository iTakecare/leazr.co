
import React from "react";
import Container from "@/components/layout/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Folder, Download, Package, Users, Settings } from "lucide-react";
import BrandManager from "@/components/catalog/BrandManager";
import CategoryManager from "@/components/catalog/CategoryManager";
import { PackManager } from "@/components/packs/PackManager";
import { ClientCatalogManager } from "@/components/catalog/client-management/ClientCatalogManager";

// Import refactored components
import CatalogHeader from "@/components/catalog/management/CatalogHeader";
import CatalogFilterBar from "@/components/catalog/management/CatalogFilterBar";
import CatalogContent from "@/components/catalog/management/CatalogContent";
import PublicCatalogSettings from "@/components/catalog/management/PublicCatalogSettings";
import { useCatalogManagement } from "@/hooks/catalog/useCatalogManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

const CatalogManagement = () => {
  const isMobile = useIsMobile();
  const { navigateToAdmin } = useRoleNavigation();
  
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
    handleViewModeChange,
    filters,
    updateFilter,
    resetFilters,
    categories,
    hasActiveFilters
  } = useCatalogManagement();
  
  // Handle new product creation
  const handleAddNewProduct = () => {
    navigateToAdmin("catalog/form");
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
            <TabsTrigger value="packs">
              <Package className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Packs" : <span>Packs</span>}
            </TabsTrigger>
            <TabsTrigger value="client-catalogs">
              <Users className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Clients" : <span>Catalogues Clients</span>}
            </TabsTrigger>
            <TabsTrigger value="configuration">
              <Settings className={isMobile ? "" : "mr-2 h-4 w-4"} />
              {isMobile ? "Config" : <span>Configuration</span>}
            </TabsTrigger>
            <TabsTrigger value="import" onClick={() => navigateToAdmin("catalog/import")}>
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
                <CatalogFilterBar
                  searchQuery={filters.searchQuery}
                  onSearchChange={(query) => updateFilter('searchQuery', query)}
                  selectedCategory={filters.selectedCategory}
                  onCategoryChange={(category) => updateFilter('selectedCategory', category)}
                  categories={categories}
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onSortChange={(sortBy) => updateFilter('sortBy', sortBy as any)}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={resetFilters}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  groupingOption={groupingOption}
                  onGroupingChange={setGroupingOption}
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

        <TabsContent value="client-catalogs">
          <ClientCatalogManager />
        </TabsContent>

        <TabsContent value="configuration">
          <PublicCatalogSettings />
        </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
};

export default CatalogManagement;
