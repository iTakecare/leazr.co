
import React, { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Package, 
  Monitor, 
  Laptop, 
  Tablet, 
  Smartphone, 
  Tv, 
  Radio, 
  SlidersHorizontal,
  ArrowUpDown, 
  X, 
  Layers,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, ProductVariationAttributes } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import ProductGrid from "./ProductCatalogGrid";
import ProductList from "./ProductCatalogList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductVariantSelector from "./ProductVariantSelector";

export type Category = 'all' | 'desktop' | 'laptop' | 'tablet' | 'smartphone' | 'display' | 'accessory' | 'peripheral' | 'other';
export type ViewMode = 'grid' | 'list';
export type GroupOption = 'none' | 'category' | 'brand';
export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  editMode?: boolean;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  editMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupOption>("none");
  const [selectedSort, setSelectedSort] = useState<SortOption>("name-asc");
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<string[]>([]);
  const [showVariants, setShowVariants] = useState(true);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<Product | null>(null);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [schemaChecked, setSchemaChecked] = useState(false);
  const [hasVariantSupport, setHasVariantSupport] = useState(false);
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-catalog", isOpen],
    queryFn: () => getProducts(),
    enabled: isOpen,
  });

  // Check schema to see if we have variant columns
  useEffect(() => {
    const checkSchema = async () => {
      try {
        const { error } = await supabase
          .from('products')
          .select('is_parent, parent_id, variation_attributes')
          .limit(1);
          
        setHasVariantSupport(!error);
      } catch (error) {
        console.error('Error checking schema:', error);
        setHasVariantSupport(false);
      } finally {
        setSchemaChecked(true);
      }
    };
    
    if (isOpen && !schemaChecked) {
      checkSchema();
    }
  }, [isOpen, schemaChecked]);

  const toggleVariantGroup = (productId: string) => {
    if (expandedVariantGroups.includes(productId)) {
      setExpandedVariantGroups(expandedVariantGroups.filter(id => id !== productId));
    } else {
      setExpandedVariantGroups([...expandedVariantGroups, productId]);
    }
  };

  const getParentForVariant = (product: Product): Product | undefined => {
    if (!product.parent_id) return undefined;
    return products.find(p => p.id === product.parent_id);
  };

  const handleSelectSort = (option: SortOption) => {
    setSelectedSort(option);
  };

  const sortProducts = (productsToSort: Product[]): Product[] => {
    const [sortBy, direction] = selectedSort.split('-') as ['name' | 'price', 'asc' | 'desc'];
    return [...productsToSort].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.brand || ''} ${a.name}`.toLowerCase();
        const nameB = `${b.brand || ''} ${b.name}`.toLowerCase();
        return direction === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        // Sort by price
        const priceA = a.monthly_price || 0;
        const priceB = b.monthly_price || 0;
        return direction === 'asc' 
          ? priceA - priceB
          : priceB - priceA;
      }
    });
  };

  const filterProducts = (productsToFilter: Product[]): Product[] => {
    return productsToFilter.filter(product => {
      // Skip variants if we're not showing them or if we're grouping
      if (!showVariants && product.parent_id) {
        return false;
      }
      
      const matchesSearch = 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesCategory = 
        selectedCategory === 'all' || 
        product.category === selectedCategory;
      
      const matchesPriceRange = 
        (product.monthly_price || 0) >= priceRange[0] && 
        (product.monthly_price || 0) <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesPriceRange;
    });
  };

  const groupProducts = (productsToGroup: Product[]): Record<string, Product[]> => {
    if (groupBy === 'none') {
      return { ungrouped: productsToGroup };
    }
    
    return productsToGroup.reduce((groups: Record<string, Product[]>, product) => {
      // Skip variants when grouping
      if (product.parent_id) {
        return groups;
      }
      
      const groupKey = groupBy === 'category' 
        ? (product.category || 'other')
        : (product.brand || 'Autre');
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(product);
      return groups;
    }, {});
  };

  // Process products: filter, sort, group
  const processedProducts = (() => {
    const filtered = filterProducts(products);
    const sorted = sortProducts(filtered);
    return groupProducts(sorted);
  })();

  const getVariantsForProduct = (parentId: string): Product[] => {
    return products.filter(p => p.parent_id === parentId);
  };

  const isVariantGroupExpanded = (productId: string): boolean => {
    return expandedVariantGroups.includes(productId);
  };

  const getCategoryIcon = (category: Category) => {
    switch(category) {
      case 'desktop':
        return <Monitor className="h-6 w-6" />;
      case 'laptop':
        return <Laptop className="h-6 w-6" />;
      case 'tablet':
        return <Tablet className="h-6 w-6" />;
      case 'smartphone':
        return <Smartphone className="h-6 w-6" />;
      case 'display':
        return <Tv className="h-6 w-6" />;
      case 'accessory':
      case 'peripheral':
        return <Radio className="h-6 w-6" />;
      case 'other':
        return <Package className="h-6 w-6" />;
      default:
        return <Package className="h-6 w-6" />;
    }
  };

  const getCategoryName = (category: Category): string => {
    switch(category) {
      case 'all': return 'Tous les produits';
      case 'desktop': return 'Ordinateurs fixes';
      case 'laptop': return 'Ordinateurs portables';
      case 'tablet': return 'Tablettes';
      case 'smartphone': return 'Smartphones';
      case 'display': return 'Écrans';
      case 'accessory': return 'Accessoires';
      case 'peripheral': return 'Périphériques';
      case 'other': return 'Autres produits';
      default: return 'Produits';
    }
  };

  // Available categories - can be enhanced to get from the database
  const categories: Category[] = ['all', 'desktop', 'laptop', 'tablet', 'smartphone', 'display', 'accessory', 'peripheral', 'other'];

  const sortOptions = [
    { value: 'name-asc', label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'price-asc', label: 'Prix (croissant)' },
    { value: 'price-desc', label: 'Prix (décroissant)' },
  ];

  const handleProductSelect = (product: Product) => {
    // If the product is a parent with variants, show variant selector
    if (hasVariantSupport && (product.is_parent || product.variant_combination_prices?.length)) {
      setSelectedVariantProduct(product);
      setShowVariantSelector(true);
    } else {
      onSelectProduct(product);
      onClose();
    }
  };

  const handleVariantSelect = (selectedProduct: Product) => {
    setShowVariantSelector(false);
    onSelectProduct(selectedProduct);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-blue-900">
            <Package className="h-5 w-5 text-blue-600" />
            Catalogue des produits
          </DialogTitle>
          <div className="flex items-center gap-4">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                title="Vue en grille"
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                title="Vue en liste"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Category filters */}
        <div className="p-4 overflow-x-auto border-b">
          <ScrollArea className="whitespace-nowrap">
            <div className="flex gap-2 min-w-max">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="flex flex-col items-center p-3 h-auto min-w-[100px]"
                  onClick={() => setSelectedCategory(category)}
                >
                  {getCategoryIcon(category)}
                  <span className="text-xs mt-1">{getCategoryName(category)}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Search and filter bar */}
        <div className="p-4 flex items-center justify-between gap-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtrer</span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  const currentIndex = sortOptions.findIndex(
                    opt => opt.value === selectedSort
                  );
                  const nextIndex = (currentIndex + 1) % sortOptions.length;
                  setSelectedSort(sortOptions[nextIndex].value as SortOption);
                }}
              >
                <span className="hidden sm:inline">Trier par</span>
                <span className="text-sm font-medium">
                  {sortOptions.find(opt => opt.value === selectedSort)?.label}
                </span>
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Filters */}
        {showFilters && (
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plage de prix (mensualité)
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      placeholder="Min"
                    />
                  </div>
                  <span className="text-gray-500">à</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={priceRange[0]}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grouper par
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupOption)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="none">Aucun groupement</option>
                  <option value="category">Catégorie</option>
                  <option value="brand">Marque</option>
                </select>
              </div>

              {hasVariantSupport && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affichage des variantes
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showVariants}
                        onChange={(e) => setShowVariants(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-gray-700">Afficher les variantes</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products display - grid or list */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : Object.entries(processedProducts).length === 0 || 
                 (Object.keys(processedProducts).length === 1 && 
                  Object.values(processedProducts)[0].length === 0) ? (
                <div className="text-center text-gray-500 py-8">
                  Aucun produit ne correspond à votre recherche
                </div>
              ) : (
                <>
                  {/* Handle grouped products */}
                  {Object.entries(processedProducts).map(([groupName, groupProducts]) => (
                    <div key={groupName} className="mb-8">
                      {/* Only show group header if we're grouping */}
                      {groupBy !== 'none' && groupName !== 'ungrouped' && (
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                          {groupBy === 'category' && getCategoryIcon(groupName as Category)}
                          {groupBy === 'category' ? getCategoryName(groupName as Category) : groupName}
                          <span className="text-xs text-gray-500 font-normal">({groupProducts.length})</span>
                        </h3>
                      )}
                      
                      {viewMode === 'grid' ? (
                        <ProductGrid 
                          products={groupProducts}
                          getProductImage={(product) => product.image_url || ''}
                          getVariantsForProduct={getVariantsForProduct}
                          isVariantGroupExpanded={isVariantGroupExpanded}
                          toggleVariantGroup={toggleVariantGroup}
                          onSelectProduct={handleProductSelect}
                          hasVariantSupport={hasVariantSupport}
                          editMode={editMode}
                        />
                      ) : (
                        <ProductList
                          products={groupProducts}
                          getProductImage={(product) => product.image_url || ''}
                          getVariantsForProduct={getVariantsForProduct}
                          isVariantGroupExpanded={isVariantGroupExpanded}
                          toggleVariantGroup={toggleVariantGroup}
                          onSelectProduct={handleProductSelect}
                          hasVariantSupport={hasVariantSupport}
                          editMode={editMode}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      {/* Variant Selector Dialog */}
      {showVariantSelector && selectedVariantProduct && (
        <ProductVariantSelector
          product={selectedVariantProduct}
          isOpen={showVariantSelector}
          onClose={() => setShowVariantSelector(false)}
          onSelectVariant={handleVariantSelect}
        />
      )}
    </Dialog>
  );
};

export default ProductCatalog;
