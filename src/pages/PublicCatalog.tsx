
import React, { useState, useEffect } from 'react';
import { getProducts, getCategories, getBrands } from '@/services/catalogService';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import Container from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductGridCard from '@/components/catalog/public/ProductGridCard';
import PublicHeader from '@/components/catalog/public/PublicHeader';
import ProductRequestForm from '@/components/catalog/public/ProductRequestForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Filter } from 'lucide-react';
import { type Product } from '@/types/catalog';
import { useProductMapper } from '@/hooks/products/useProductMapper';

const PublicCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const { mapDatabaseProductsToAppProducts } = useProductMapper();

  // Fetch data
  const { data: productsData = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['public-products'],
    queryFn: getProducts
  });

  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['public-categories'],
    queryFn: getCategories
  });
  
  const { data: brandsData = [], isLoading: isLoadingBrands } = useQuery({
    queryKey: ['public-brands'],
    queryFn: getBrands
  });

  // Process product data to handle variants
  const products = React.useMemo(() => {
    // Convert DB format to app format
    const mappedProducts = mapDatabaseProductsToAppProducts(productsData);
    
    // Enhance products with price information
    return mappedProducts.map(product => {
      // Handle variant pricing if this is a parent product
      if (product.is_parent) {
        // For products with variants, find the minimum price from variant combination prices
        const variantPrices = product.variant_combination_prices || [];
        if (variantPrices.length > 0) {
          const prices = variantPrices.map(v => v.price).filter(p => p !== null && p !== undefined);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            return {
              ...product,
              min_price: minPrice,
              price: product.price || minPrice // Fallback to min price if main price isn't set
            };
          }
        }
      }
      return product;
    });
  }, [productsData, mapDatabaseProductsToAppProducts]);

  // Apply filters when inputs change
  useEffect(() => {
    const applyFilters = () => {
      let result = [...products];
      
      // Apply search term filter
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        result = result.filter(product => 
          product.name.toLowerCase().includes(searchLower) || 
          product.description?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply category filter
      if (selectedCategory) {
        result = result.filter(product => product.category === selectedCategory);
      }
      
      // Apply brand filter
      if (selectedBrand) {
        result = result.filter(product => product.brand === selectedBrand);
      }
      
      // Sort by name
      result.sort((a, b) => a.name.localeCompare(b.name));
      
      setFilteredProducts(result);
    };
    
    applyFilters();
  }, [products, searchTerm, selectedCategory, selectedBrand]);
  
  // Create lists of unique categories and brands
  const categories = React.useMemo(() => {
    const allCategories = products
      .map(product => product.category)
      .filter((category, index, self) => 
        category && self.indexOf(category) === index
      )
      .sort();
    
    return allCategories;
  }, [products]);
  
  const brands = React.useMemo(() => {
    const allBrands = products
      .map(product => product.brand)
      .filter((brand, index, self) => 
        brand && self.indexOf(brand) === index
      )
      .sort();
    
    return allBrands;
  }, [products]);
  
  // Get translations from the categoriesData
  const getCategoryTranslation = (categoryName: string) => {
    if (!categoriesData) return categoryName;
    const category = categoriesData.find((c: any) => c.name === categoryName);
    return category?.translation || categoryName;
  };
  
  // Get translations from the brandsData
  const getBrandTranslation = (brandName: string) => {
    if (!brandsData) return brandName;
    const brand = brandsData.find((b: any) => b.name === brandName);
    return brand?.translation || brandName;
  };
  
  if (isLoadingProducts || isLoadingCategories || isLoadingBrands) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Chargement du catalogue...</p>
      </div>
    );
  }
  
  if (productsError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-red-500">Une erreur est survenue lors du chargement du catalogue.</p>
        <Button 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <Container className="py-8">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Sidebar filters */}
          <div className="w-full md:w-64 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Categories */}
                <div className="space-y-2">
                  <h3 className="font-medium">Catégories</h3>
                  <div className="space-y-1">
                    <Button
                      variant={selectedCategory === null ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(null)}
                    >
                      Toutes les catégories
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {getCategoryTranslation(category)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Brands */}
                <div className="space-y-2">
                  <h3 className="font-medium">Marques</h3>
                  <div className="space-y-1">
                    <Button
                      variant={selectedBrand === null ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedBrand(null)}
                    >
                      Toutes les marques
                    </Button>
                    {brands.map((brand) => (
                      <Button
                        key={brand}
                        variant={selectedBrand === brand ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedBrand(brand)}
                      >
                        {getBrandTranslation(brand)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedBrand(null);
                    setSearchTerm('');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vous ne trouvez pas ce que vous cherchez ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nous pouvons vous aider à trouver le matériel dont vous avez besoin, même s'il n'est pas dans notre catalogue.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => setShowRequestDialog(true)}
                >
                  Faire une demande
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            <Tabs defaultValue="grid" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedCategory 
                    ? `Catégorie: ${getCategoryTranslation(selectedCategory)}` 
                    : selectedBrand 
                      ? `Marque: ${getBrandTranslation(selectedBrand)}` 
                      : "Catalogue"}
                </h2>
                <TabsList>
                  <TabsTrigger value="grid">Grille</TabsTrigger>
                  <TabsTrigger value="list">Liste</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Results count */}
              <div className="mb-4">
                <p className="text-muted-foreground">
                  {filteredProducts.length} produits trouvés
                </p>
              </div>
              
              <TabsContent value="grid">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <p>Aucun produit trouvé. Veuillez modifier vos filtres ou faire une demande personnalisée.</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowRequestDialog(true)}
                    >
                      Faire une demande
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <ProductGridCard 
                        key={product.id}
                        product={product} 
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="list">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <p>Aucun produit trouvé. Veuillez modifier vos filtres ou faire une demande personnalisée.</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowRequestDialog(true)}
                    >
                      Faire une demande
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map((product) => (
                      <Card key={product.id}>
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-48 h-48 bg-gray-100">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <p className="text-gray-400">No image</p>
                                </div>
                              )}
                            </div>
                            <div className="p-4 flex-1">
                              <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {product.brand && `${getBrandTranslation(product.brand)} | `}
                                {product.category && getCategoryTranslation(product.category)}
                              </p>
                              <p className="text-sm line-clamp-2">{product.description}</p>
                              <div className="mt-4 flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-lg">{product.price ? `${product.price.toFixed(2)}€` : 'Prix sur demande'}</p>
                                </div>
                                <Link to={`/products/${product.id}`}>
                                  <Button>Voir le détail</Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Container>
      
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de matériel personnalisée</DialogTitle>
          </DialogHeader>
          <ProductRequestForm onSubmitSuccess={() => setShowRequestDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicCatalog;
