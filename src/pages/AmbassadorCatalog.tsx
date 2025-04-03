
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { getProducts } from "@/services/catalogService";
import { Search, Filter, Tag, Laptop, Monitor, Phone, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import AmbassadorProductGrid from "@/components/ambassador/AmbassadorProductGrid";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/catalog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AmbassadorCatalog = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // Extract available categories and brands from products
  const categories = React.useMemo(() => {
    const allCategories = products
      .map(product => product.category)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return allCategories;
  }, [products]);

  const brands = React.useMemo(() => {
    const allBrands = products
      .map(product => product.brand)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return allBrands;
  }, [products]);
  
  // Filter products based on search, category, brand, and price
  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery || 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      // Brand filter
      const matchesBrand = !selectedBrand || product.brand === selectedBrand;
      
      // Price filter - use monthly price if available, otherwise use regular price
      const productPrice = product.monthly_price || 0;
      const matchesPrice = productPrice >= priceRange[0] && productPrice <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, priceRange]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedBrand(null);
    setPriceRange([0, 10000]);
  };

  // Calculate price range limits
  useEffect(() => {
    if (products.length > 0) {
      const prices = products
        .map(product => product.monthly_price || 0)
        .filter(price => price > 0);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        setPriceRange([minPrice, maxPrice]);
      }
    }
  }, [products]);
    
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch(category?.toLowerCase()) {
      case 'laptop':
      case 'ordinateur portable':
        return <Laptop className="h-4 w-4 mr-2" />;
      case 'desktop':
      case 'ordinateur fixe':
        return <Monitor className="h-4 w-4 mr-2" />;
      case 'smartphone':
      case 'téléphone':
        return <Phone className="h-4 w-4 mr-2" />;
      default:
        return <Tag className="h-4 w-4 mr-2" />;
    }
  };
  
  return (
    <Container>
      <motion.div 
        className="py-6 md:py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Catalogue Produits</h1>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Collapsible filters section */}
        <Collapsible open={showFilters} className="mb-6">
          <CollapsibleContent>
            <div className="bg-gray-50 p-4 rounded-lg border space-y-6">
              {/* Category filter */}
              <div>
                <h3 className="font-medium mb-2">Catégories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    >
                      {getCategoryIcon(category)}
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Brand filter */}
              <div>
                <h3 className="font-medium mb-2">Marques</h3>
                <div className="flex flex-wrap gap-2">
                  {brands.map(brand => (
                    <Badge
                      key={brand}
                      variant={selectedBrand === brand ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                    >
                      {brand}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price range slider */}
              <div>
                <h3 className="font-medium mb-2">Prix mensuel</h3>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-24"
                  />
                  <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
                  <Input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Reset filters button */}
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Selected filters */}
        {(selectedCategory || selectedBrand || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Filtres actifs:</span>
            
            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedCategory}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => setSelectedCategory(null)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {selectedBrand && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedBrand}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => setSelectedBrand(null)}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Recherche: {searchQuery}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-gray-500"
              onClick={resetFilters}
            >
              Tout effacer
            </Button>
          </div>
        )}
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            Une erreur s'est produite lors du chargement des produits. Veuillez réessayer.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-xl font-medium mb-2">Aucun produit trouvé</p>
            <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">{filteredProducts.length} produit(s) trouvé(s)</p>
            <AmbassadorProductGrid products={filteredProducts} />
          </div>
        )}
      </motion.div>
    </Container>
  );
};

export default AmbassadorCatalog;
