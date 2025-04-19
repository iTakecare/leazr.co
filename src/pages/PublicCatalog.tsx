import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Filter, TagIcon, ChevronDown, ChevronUp, CheckCircle2, XSquare } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import { Product } from "@/types/catalog";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProductFilter } from "@/hooks/products/useProductFilter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import CatalogHeader from "@/components/catalog/public/CatalogHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PublicCatalog = () => {
  const navigate = useNavigate();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc" | "price-asc" | "price-desc">("name-asc");

  const sortOptions = [
    { value: "name-asc", label: "Nom (A-Z)" },
    { value: "name-desc", label: "Nom (Z-A)" },
    { value: "price-asc", label: "Prix (croissant)" },
    { value: "price-desc", label: "Prix (décroissant)" },
  ] as const;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts({ includeAdminOnly: false }),
  });

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    isPriceFilterActive,
    setIsPriceFilterActive,
    selectedBrands,
    setSelectedBrands,
    showInStock,
    setShowInStock,
    filteredProducts,
    categories,
    brands,
    priceRangeLimits,
    resetFilters
  } = useProductFilter(products);

  useEffect(() => {
    if (products && products.length > 0) {
      console.log("Total products loaded:", products.length);
      
      const productsWithVariants = products.filter(p => 
        p.variants && p.variants.length > 0 || 
        p.variant_combination_prices && p.variant_combination_prices.length > 0 ||
        p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0
      );
      
      console.log("Products with variants:", productsWithVariants.length);
    }
  }, [products]);

  const groupedProducts = React.useMemo(() => {
    if (!filteredProducts) return [];
    
    const parentProducts = filteredProducts.filter(p => 
      !p.parent_id && !p.is_variation
    );
    
    const variantMap = new Map<string, Product[]>();
    
    filteredProducts.forEach(product => {
      if (product.parent_id) {
        const variants = variantMap.get(product.parent_id) || [];
        variants.push(product);
        variantMap.set(product.parent_id, variants);
      }
    });
    
    parentProducts.forEach(parent => {
      if (parent.id) {
        const variants = variantMap.get(parent.id) || [];
        parent.variants = variants;
        parent.is_parent = variants.length > 0 || 
                          (parent.variation_attributes && Object.keys(parent.variation_attributes).length > 0) ||
                          (parent.variant_combination_prices && parent.variant_combination_prices.length > 0);
      }
    });
    
    if (parentProducts.length <= 1) {
      console.log("ATTENTION: Nombre de produits limité à 1 ou 0!");
      if (parentProducts.length === 1) {
        console.log(`Seul produit: ${parentProducts[0].name} (${parentProducts[0].id})`);
      }
    }
    
    return parentProducts;
  }, [filteredProducts]);

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!filteredProducts) return [];
    
    return [...filteredProducts].sort((a, b) => {
      switch (sortOrder) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "price-asc":
          const priceA = a.monthly_price || a.price || 0;
          const priceB = b.monthly_price || b.price || 0;
          return priceA - priceB;
        case "price-desc":
          const priceC = a.monthly_price || a.price || 0;
          const priceD = b.monthly_price || b.price || 0;
          return priceD - priceC;
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortOrder]);

  const handleProductClick = (product: Product) => {
    navigate(`/produits/${product.id}`);
  };

  const handlePriceRangeChange = (values: number[]) => {
    setPriceRange(values as [number, number]);
    setIsPriceFilterActive(true);
  };

  const handleSortChange = () => {
    const orders: Array<"name-asc" | "name-desc" | "price-asc" | "price-desc"> = [
      "name-asc",
      "name-desc",
      "price-asc",
      "price-desc"
    ];
    const currentIndex = orders.indexOf(sortOrder);
    const nextIndex = (currentIndex + 1) % orders.length;
    setSortOrder(orders[nextIndex]);
  };

  const getSortLabel = () => {
    return sortOptions.find(option => option.value === sortOrder)?.label || "Trier par";
  };

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      
      <div className="pt-[130px]">
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <CatalogHeader />
        </div>
      
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-6">
            <Collapsible 
              open={isMobileFiltersOpen || window.innerWidth >= 1024}
              className="lg:w-64 lg:block"
            >
              <CollapsibleContent className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg">Filtres</h3>
                  <Button 
                    onClick={resetFilters} 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                  >
                    Réinitialiser
                  </Button>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Accordion type="single" collapsible defaultValue="categories">
                    <AccordionItem value="categories" className="border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4" />
                          <span>Catégories</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2">
                          <div 
                            className={`flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded ${selectedCategory === null ? 'bg-blue-50 text-[#33638e] font-medium' : ''}`}
                            onClick={() => setSelectedCategory(null)}
                          >
                            <span>Toutes les catégories</span>
                          </div>
                          <ScrollArea className="h-[200px] pr-2">
                            <div className="space-y-2">
                              {categories.map((category) => (
                                <div
                                  key={category.name}
                                  className={`flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded ${selectedCategory === category.name ? 'bg-blue-50 text-[#33638e] font-medium' : ''}`}
                                  onClick={() => setSelectedCategory(category.name)}
                                >
                                  <span>{category.translation}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Accordion type="single" collapsible defaultValue="price">
                    <AccordionItem value="price" className="border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>Prix</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          <div className="pt-2">
                            <Slider
                              defaultValue={priceRangeLimits}
                              value={priceRange}
                              max={priceRangeLimits[1]}
                              min={priceRangeLimits[0]}
                              step={10}
                              onValueChange={handlePriceRangeChange}
                              className="mb-6"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="bg-gray-100 px-2 py-1 rounded">
                              {priceRange[0]} €
                            </div>
                            <Checkbox 
                              id="price-filter-active"
                              checked={isPriceFilterActive}
                              onCheckedChange={(checked) => setIsPriceFilterActive(!!checked)}
                              className="mx-2"
                            />
                            <label htmlFor="price-filter-active" className="text-xs text-gray-500">
                              Filtre actif
                            </label>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                              {priceRange[1]} €
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Accordion type="single" collapsible defaultValue="brands">
                    <AccordionItem value="brands" className="border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>Marques</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2">
                          <ScrollArea className="h-[180px] pr-2">
                            <div className="space-y-2">
                              {brands.map((brand) => (
                                <div key={brand} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`brand-${brand}`} 
                                    checked={selectedBrands.includes(brand)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedBrands([...selectedBrands, brand]);
                                      } else {
                                        setSelectedBrands(selectedBrands.filter(b => b !== brand));
                                      }
                                    }}
                                  />
                                  <label 
                                    htmlFor={`brand-${brand}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {brand}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Accordion type="single" collapsible defaultValue="stock">
                    <AccordionItem value="stock" className="border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>Disponibilité</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          <div 
                            className={`flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded ${showInStock === null ? 'bg-blue-50 text-[#33638e] font-medium' : ''}`}
                            onClick={() => setShowInStock(null)}
                          >
                            <span>Tous les produits</span>
                          </div>
                          <div 
                            className={`flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded ${showInStock === true ? 'bg-blue-50 text-[#33638e] font-medium' : ''}`}
                            onClick={() => setShowInStock(true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            <span>En stock</span>
                          </div>
                          <div 
                            className={`flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded ${showInStock === false ? 'bg-blue-50 text-[#33638e] font-medium' : ''}`}
                            onClick={() => setShowInStock(false)}
                          >
                            <XSquare className="h-4 w-4 mr-2 text-red-500" />
                            <span>Hors stock</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                <div className="lg:hidden space-y-2 pt-2">
                  <h4 className="text-sm font-medium">Filtres actifs:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <Badge variant="secondary" className="flex gap-1 items-center">
                        {categories.find(c => c.name === selectedCategory)?.translation || selectedCategory}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedCategory(null)}
                        >
                          <XSquare className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {selectedBrands.map(brand => (
                      <Badge key={brand} variant="secondary" className="flex gap-1 items-center">
                        {brand}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedBrands(selectedBrands.filter(b => b !== brand))}
                        >
                          <XSquare className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {isPriceFilterActive && (
                      <Badge variant="secondary" className="flex gap-1 items-center">
                        Prix: {priceRange[0]}€ - {priceRange[1]}€
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => {
                            setPriceRange(priceRangeLimits);
                            setIsPriceFilterActive(false);
                          }}
                        >
                          <XSquare className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {showInStock !== null && (
                      <Badge variant="secondary" className="flex gap-1 items-center">
                        {showInStock ? "En stock" : "Hors stock"}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setShowInStock(null)}
                        >
                          <XSquare className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <p className="text-gray-600">
                  {groupedProducts.length} produit{groupedProducts.length > 1 ? 's' : ''} trouvé{groupedProducts.length > 1 ? 's' : ''}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      {getSortLabel()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setSortOrder(option.value)}
                        className={sortOrder === option.value ? "bg-accent" : ""}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow animate-pulse h-[280px]">
                      <div className="h-0 pb-[100%] bg-gray-200 rounded-t-lg"></div>
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : groupedProducts.length === 0 ? (
                <div className="text-center py-16">
                  <h3 className="text-lg font-medium">Aucun produit trouvé</h3>
                  <p className="text-gray-500 mt-2">
                    Essayez de modifier vos critères de recherche.
                  </p>
                  <Button onClick={resetFilters} className="mt-4">
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedProducts.map((product) => (
                    <ProductGridCard 
                      key={product.id} 
                      product={product} 
                      onClick={() => handleProductClick(product)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCatalog;
