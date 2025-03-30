
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ChevronDown, ChevronRight, Filter, X, Euro } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/types/catalog";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

type SortOption = {
  label: string;
  value: string;
  direction: "asc" | "desc";
};

const PriceRangeFilter = ({ 
  minPrice, 
  maxPrice, 
  onPriceChange 
}: { 
  minPrice: number; 
  maxPrice: number; 
  onPriceChange: (min: number, max: number) => void 
}) => {
  const [localRange, setLocalRange] = useState<[number, number]>([minPrice, maxPrice]);
  
  const handleChange = (values: number[]) => {
    setLocalRange([values[0], values[1]]);
    onPriceChange(values[0], values[1]);
  };
  
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center">
          <Euro className="h-4 w-4 mr-1 opacity-70" />
          {localRange[0]}€
        </span>
        <span className="text-sm font-medium">
          {localRange[1]}€
        </span>
      </div>
      <Slider
        defaultValue={[minPrice, maxPrice]}
        min={0}
        max={200}
        step={5}
        value={[localRange[0], localRange[1]]}
        onValueChange={handleChange}
        className="w-full"
      />
    </div>
  );
};

const PublicCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(true);
  
  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  
  // Fetch brands
  const { data: brandsData = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const sortOptions: SortOption[] = [
    { label: "Nom", value: "name", direction: "asc" },
    { label: "Prix (croissant)", value: "price", direction: "asc" },
    { label: "Prix (décroissant)", value: "price", direction: "desc" },
    { label: "Catégorie", value: "category", direction: "asc" }
  ];

  const handleSortChange = (option: SortOption) => {
    setSortBy(option.value);
    setSortDirection(option.direction);
  };
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category === activeCategory ? null : category);
  };
  
  const handleSubcategoryToggle = (subcategory: string) => {
    setActiveSubcategories(prev => {
      return prev.includes(subcategory) 
        ? prev.filter(item => item !== subcategory)
        : [...prev, subcategory];
    });
  };
  
  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => {
      return prev.includes(brand)
        ? prev.filter(item => item !== brand)
        : [...prev, brand];
    });
  };
  
  const handlePriceChange = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };
  
  const clearAllFilters = () => {
    setActiveCategory(null);
    setActiveSubcategories([]);
    setSelectedBrands([]);
    setMinPrice(0);
    setMaxPrice(200);
    setSearchTerm("");
  };

  // Group products by parent/variant relationship
  const groupedProducts = React.useMemo(() => {
    const parentProducts = products.filter(p => 
      !p.parent_id && !p.is_variation
    );
    
    const variantMap = new Map<string, Product[]>();
    
    products.forEach(product => {
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
    
    return parentProducts;
  }, [products]);
  
  // Get all available subcategories for the active category
  const availableSubcategories = React.useMemo(() => {
    if (!activeCategory) return [];
    
    // Extract model property (which will serve as our subcategory)
    const subcategories = new Set<string>();
    groupedProducts.forEach(product => {
      if (product.category === activeCategory && product.model) {
        subcategories.add(product.model);
      }
    });
    
    return Array.from(subcategories);
  }, [groupedProducts, activeCategory]);
  
  // Filter and sort products
  const sortedAndFilteredProducts = React.useMemo(() => {
    const filteredProducts = groupedProducts.filter((product: Product) => {
      // Match search term
      const matchesSearch = searchTerm === "" ||
                           product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Match category
      const matchesCategory = !activeCategory || product.category === activeCategory;
      
      // Match subcategory if applicable (using model field as subcategory)
      const matchesSubcategory = activeSubcategories.length === 0 || 
                               (product.model && activeSubcategories.includes(product.model));
      
      // Match price range
      const productPrice = product.monthly_price || 0;
      const matchesPriceRange = productPrice >= minPrice && productPrice <= maxPrice;
      
      // Match selected brands
      const matchesBrand = selectedBrands.length === 0 || 
                         (product.brand && selectedBrands.includes(product.brand));
      
      return matchesSearch && matchesCategory && matchesSubcategory && matchesPriceRange && matchesBrand;
    });
    
    // Sort products
    return filteredProducts.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return sortDirection === "asc" 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        case "price":
          const priceA = a.monthly_price || 0;
          const priceB = b.monthly_price || 0;
          return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
        case "category":
          const catA = a.category || "";
          const catB = b.category || "";
          return sortDirection === "asc" 
            ? catA.localeCompare(catB) 
            : catB.localeCompare(catA);
        default:
          return 0;
      }
    });
  }, [groupedProducts, searchTerm, activeCategory, activeSubcategories, sortBy, sortDirection, minPrice, maxPrice, selectedBrands]);

  const handleProductClick = (product: Product) => {
    navigate(`/produits/${product.id}`);
  };
  
  // Get all available brands
  const availableBrands = React.useMemo(() => {
    return brandsData.length > 0 
      ? brandsData 
      : Array.from(new Set(groupedProducts
          .filter(product => product.brand)
          .map(product => product.brand as string)
        ));
  }, [brandsData, groupedProducts]);

  const activeFiltersCount = [
    activeCategory !== null,
    activeSubcategories.length > 0,
    selectedBrands.length > 0,
    minPrice > 0 || maxPrice < 200
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="bg-gradient-to-br from-[#33638e] via-[#347599] to-[#4ab6c4] text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/2 lg:w-2/5">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#33638e]/70 to-[#33638e] z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1974&auto=format&fit=crop" 
            alt="Groupe de personnes utilisant des ordinateurs portables sur une échelle" 
            className="h-full w-full object-cover object-center opacity-80"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold mb-4">Équipement premium reconditionné pour des équipes performantes</h1>
              <p className="text-lg mb-8">Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection de matériel Apple et PC haute qualité, à l'impact environnemental réduit.</p>
              
              <div className="relative flex-1 mb-4 max-w-lg">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="pl-10 border-[#4ab6c4]/30 focus-visible:ring-[#33638e]/50 bg-white/95 h-12 text-gray-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button size="lg" variant="outline" className="bg-white text-[#33638e] hover:bg-gray-100 border-white">
                  Parler à un conseiller
                </Button>
                <Button size="lg" className="bg-[#da2959]/80 hover:bg-[#da2959] border-0">
                  Demander un devis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar with filters */}
          <div className={`w-full md:w-64 lg:w-72 relative z-20 transition-all duration-300 ${filterMenuOpen ? 'md:block' : 'hidden'}`}>
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </h2>
                
                <div className="flex gap-1">
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Effacer
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 md:hidden" 
                    onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <ScrollArea className="h-[calc(100vh-250px)] pr-3">
                {/* Categories filter */}
                <Collapsible defaultOpen className="mb-6">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-left font-medium mb-2">
                    Catégories
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    <div 
                      className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${!activeCategory ? 'bg-primary/10 text-primary font-medium' : ''}`}
                      onClick={() => setActiveCategory(null)}
                    >
                      Tous les produits
                    </div>
                    
                    {categories.map((category) => (
                      <div key={category.name} className="space-y-1">
                        <div className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${activeCategory === category.name ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                          <div 
                            className="flex-1"
                            onClick={() => handleCategoryClick(category.name)}
                          >
                            {category.translation}
                          </div>
                          {/* Expand/collapse icon if category has subcategories */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 p-0"
                            onClick={() => toggleCategory(category.name)}
                          >
                            {expandedCategories[category.name] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Subcategories */}
                        {expandedCategories[category.name] && activeCategory === category.name && availableSubcategories.length > 0 && (
                          <div className="pl-4 space-y-1 pt-1">
                            {availableSubcategories.map(subcategory => (
                              <div key={subcategory} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`subcategory-${subcategory}`}
                                  checked={activeSubcategories.includes(subcategory)}
                                  onCheckedChange={() => handleSubcategoryToggle(subcategory)}
                                />
                                <label 
                                  htmlFor={`subcategory-${subcategory}`}
                                  className="text-sm cursor-pointer flex-1 py-1"
                                >
                                  {subcategory}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Price filter */}
                <Collapsible defaultOpen className="mb-6">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-left font-medium mb-2">
                    Prix mensuel
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <PriceRangeFilter 
                      minPrice={minPrice} 
                      maxPrice={maxPrice} 
                      onPriceChange={handlePriceChange} 
                    />
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Brand filter */}
                <Collapsible defaultOpen className="mb-6">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-left font-medium mb-2">
                    Marque
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {availableBrands.slice(0, 5).map(brand => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`brand-${brand}`}
                          checked={selectedBrands.includes(brand)}
                          onCheckedChange={() => handleBrandToggle(brand)}
                        />
                        <label 
                          htmlFor={`brand-${brand}`}
                          className="text-sm cursor-pointer flex-1 py-1"
                        >
                          {brand}
                        </label>
                      </div>
                    ))}
                    
                    {availableBrands.length > 5 && (
                      <Button 
                        variant="link" 
                        className="text-xs p-0 h-auto mt-1"
                      >
                        Voir plus
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Sort options */}
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Trier par</h3>
                  <div className="space-y-1">
                    {sortOptions.map((option) => (
                      <div
                        key={`${option.value}-${option.direction}`}
                        className={`px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${
                          sortBy === option.value && sortDirection === option.direction
                            ? 'bg-primary/10 text-primary font-medium'
                            : ''
                        }`}
                        onClick={() => handleSortChange(option)}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            {/* Mobile filter trigger */}
            <Button 
              variant="outline" 
              className="md:hidden flex items-center mb-4"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            {/* Results count and reset */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                {sortedAndFilteredProducts.length} produits
              </h2>
            </div>
            
            {/* Product grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            ) : sortedAndFilteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium">Aucun produit trouvé</h3>
                <p className="text-gray-500 mt-2">
                  Essayez de modifier vos critères de recherche ou consultez toutes nos catégories.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={clearAllFilters}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedAndFilteredProducts.map((product) => (
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
  );
};

export default PublicCatalog;
