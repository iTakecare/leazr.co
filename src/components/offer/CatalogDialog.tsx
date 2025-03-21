
import React, { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product, ProductAttributes } from "@/types/catalog";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: Product) => void;
}

interface VariantCombinationPrice {
  id: string;
  product_id: string;
  attributes: ProductAttributes;
  price: number;
  monthly_price?: number;
  stock?: number;
}

interface ProductWithVariants extends Product {
  variant_combination_prices?: VariantCombinationPrice[];
}

interface PseudoVariant {
  id: string;
  name: string;
  parent_id: string;
  attributes: ProductAttributes;
  price: number;
  monthly_price?: number;
  image_url?: string;
  brand?: string;
  category?: string;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  
  // All products raw data
  const [allProducts, setAllProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  
  // Organized data
  const [parentProducts, setParentProducts] = useState<ProductWithVariants[]>([]);
  const [pseudoVariants, setPseudoVariants] = useState<PseudoVariant[]>([]);
  const [standaloneProducts, setStandaloneProducts] = useState<Product[]>([]);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchBrands()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      // Fetch all products
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Process products
      const processedProducts = productsData.map(product => ({
        ...product,
        attributes: typeof product.attributes === 'string' 
          ? JSON.parse(product.attributes) 
          : product.attributes,
        variant_combination_prices: typeof product.variant_combination_prices === 'string'
          ? JSON.parse(product.variant_combination_prices)
          : product.variant_combination_prices
      }));
      
      setAllProducts(processedProducts);
      organizeProducts(processedProducts);
      
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    }
  };
  
  // Organize products into parents, variants, and standalone
  const organizeProducts = (products: ProductWithVariants[]) => {
    const parents: ProductWithVariants[] = [];
    const variants: PseudoVariant[] = [];
    const standalone: Product[] = [];
    
    products.forEach(product => {
      // Check if the product is a parent with variant_combination_prices
      if (product.is_parent && product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        parents.push(product);
        
        // Create pseudo variants from variant_combination_prices
        product.variant_combination_prices.forEach(variant => {
          // Create a name for the variant based on attributes
          const attributesList = Object.entries(variant.attributes || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");
            
          const variantName = `${product.name} (${attributesList})`;
          
          variants.push({
            id: variant.id,
            name: variantName,
            parent_id: product.id,
            attributes: variant.attributes || {},
            price: variant.price || 0,
            monthly_price: variant.monthly_price,
            image_url: product.image_url,
            brand: product.brand,
            category: product.category
          });
        });
      } 
      // Check if product is a standalone product (not a parent and has no parent_id)
      else if (!product.is_parent && !product.parent_id) {
        standalone.push(product);
      }
    });
    
    setParentProducts(parents);
    setPseudoVariants(variants);
    setStandaloneProducts(standalone);
    
    console.log(`Organized ${parents.length} parent products, ${variants.length} variants, and ${standalone.length} standalone products`);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };
  
  // Apply filters
  useEffect(() => {
    if (allProducts.length > 0) {
      const filteredProducts = applyFilters(allProducts);
      organizeProducts(filteredProducts);
    }
  }, [searchTerm, selectedCategory, selectedBrand, allProducts, activeTab]);

  // Filter products based on search term, category, and brand
  const applyFilters = (products: ProductWithVariants[]) => {
    return products.filter(product => {
      // Search filter
      const nameMatch = !searchTerm || 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const categoryMatch = selectedCategory === "all" || 
        product.category === selectedCategory;
      
      // Brand filter
      const brandMatch = selectedBrand === "all" || 
        product.brand === selectedBrand;
      
      // Tab filter
      let tabMatch = true;
      if (activeTab === "parents") {
        tabMatch = !!product.is_parent && !!(product.variant_combination_prices?.length);
      } else if (activeTab === "variants") {
        // We'll handle variants specially, since they're generated from variant_combination_prices
        tabMatch = false;
      } else if (activeTab === "standalone") {
        tabMatch = !product.is_parent && !product.parent_id;
      }
      
      return nameMatch && categoryMatch && brandMatch && tabMatch;
    });
  };

  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes | undefined) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return "";
    }
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Toggle product family expansion
  const toggleFamilyExpansion = (productId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };
  
  // Get filtered variants based on current tab and filters
  const getFilteredVariants = () => {
    if (activeTab !== "variants" && activeTab !== "all") return [];
    
    return pseudoVariants.filter(variant => {
      // If we're on the variants tab, apply the search/category/brand filters to variants
      const nameMatch = !searchTerm || 
        variant.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryMatch = selectedCategory === "all" || 
        variant.category === selectedCategory;
      
      const brandMatch = selectedBrand === "all" || 
        variant.brand === selectedBrand;
        
      return nameMatch && categoryMatch && brandMatch;
    });
  };
  
  // Handle variant selection
  const handleVariantSelect = (variant: PseudoVariant) => {
    // Find parent product
    const parent = parentProducts.find(p => p.id === variant.parent_id);
    
    if (parent) {
      // Create a composite product by combining parent and variant data
      const productWithVariant: Product = {
        ...parent,
        id: parent.id, // Keep the parent ID as the main ID
        name: variant.name, // Use the detailed variant name
        price: variant.price,
        monthly_price: variant.monthly_price,
        attributes: variant.attributes, // Include the variant attributes
        selected_variant_id: variant.id, // Add a reference to the selected variant
      };
      
      handleProductSelect(productWithVariant);
    }
  };

  // Render a parent product card
  const renderParentProductCard = (product: ProductWithVariants) => {
    const hasVariants = product.variant_combination_prices && product.variant_combination_prices.length > 0;
    const isExpanded = expandedFamilies.has(product.id);
    const variantCount = product.variant_combination_prices?.length || 0;
    
    return (
      <Card key={product.id} className="mb-4 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-4 flex items-center justify-center">
              <img 
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="object-contain max-h-16 max-w-16"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium line-clamp-2">{product.name}</h3>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">Parent</Badge>
              </div>
              
              <div className="text-sm mt-2 flex flex-wrap gap-x-4">
                <p className="text-muted-foreground">
                  Prix: {product.price || 0} €
                </p>
                {product.monthly_price > 0 && (
                  <p className="text-muted-foreground">
                    Mensualité: {product.monthly_price} €
                  </p>
                )}
              </div>
              
              {hasVariants && (
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => toggleFamilyExpansion(product.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} className="mr-1" />
                        Masquer les variantes ({variantCount})
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} className="mr-1" />
                        Afficher les variantes ({variantCount})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleProductSelect(product)}
            >
              <Plus size={18} />
            </Button>
          </div>
        </CardContent>
        
        {hasVariants && isExpanded && (
          <div className="border-t bg-gray-50 p-3">
            <h4 className="text-sm font-medium mb-2 text-gray-600 pl-2">Variantes disponibles:</h4>
            <div className="space-y-2">
              {product.variant_combination_prices.map(variant => {
                const attributeDisplay = formatAttributes(variant.attributes);
                
                return (
                  <div key={variant.id} className="bg-white border rounded-md p-3">
                    <div className="flex items-center">
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-3 flex items-center justify-center">
                        <img 
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="object-contain max-h-12 max-w-12"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm line-clamp-1">{attributeDisplay}</h5>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Variante</Badge>
                        </div>
                        
                        <div className="text-xs mt-1 flex flex-wrap gap-x-3">
                          <p className="text-muted-foreground">
                            Prix: {variant.price || 0} €
                          </p>
                          {variant.monthly_price > 0 && (
                            <p className="text-muted-foreground">
                              Mensualité: {variant.monthly_price} €
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Find the corresponding pseudo variant
                          const pseudoVariant = pseudoVariants.find(pv => pv.id === variant.id);
                          if (pseudoVariant) {
                            handleVariantSelect(pseudoVariant);
                          } else {
                            // Fallback if pseudo variant not found
                            const variantProduct = {
                              ...product,
                              id: product.id,
                              price: variant.price,
                              monthly_price: variant.monthly_price,
                              attributes: variant.attributes,
                              selected_variant_id: variant.id
                            };
                            handleProductSelect(variantProduct);
                          }
                        }}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    );
  };

  // Render a standalone product card
  const renderStandaloneProductCard = (product: Product) => {
    return (
      <Card key={product.id} className="mb-3 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-4 flex items-center justify-center">
              <img 
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="object-contain max-h-16 max-w-16"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
              </div>
              
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {formatAttributes(product.attributes as ProductAttributes)}
                </p>
              )}
              
              <div className="text-sm mt-2 flex flex-wrap gap-x-4">
                <p className="text-muted-foreground">
                  Prix: {product.price || 0} €
                </p>
                {product.monthly_price > 0 && (
                  <p className="text-muted-foreground">
                    Mensualité: {product.monthly_price} €
                  </p>
                )}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 flex-shrink-0"
              onClick={() => handleProductSelect(product)}
            >
              <Plus size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render a variant card
  const renderVariantCard = (variant: PseudoVariant) => {
    return (
      <Card key={variant.id} className="mb-3 overflow-hidden border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-4 flex items-center justify-center">
              <img 
                src={variant.image_url || "/placeholder.svg"}
                alt={variant.name}
                className="object-contain max-h-16 max-w-16"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm line-clamp-2">{variant.name}</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Variante</Badge>
              </div>
              
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {formatAttributes(variant.attributes)}
              </p>
              
              <div className="text-sm mt-2 flex flex-wrap gap-x-4">
                <p className="text-muted-foreground">
                  Prix: {variant.price || 0} €
                </p>
                {variant.monthly_price > 0 && (
                  <p className="text-muted-foreground">
                    Mensualité: {variant.monthly_price} €
                  </p>
                )}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2 flex-shrink-0"
              onClick={() => handleVariantSelect(variant)}
            >
              <Plus size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sélectionner un équipement</DialogTitle>
          <DialogDescription>Choisissez un produit du catalogue à ajouter à votre offre</DialogDescription>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 my-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.translation || category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les marques</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>
                  {brand.translation || brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="standalone">Individuels</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 flex-1 overflow-hidden">
            {loading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="p-1">
                  {/* Parent Products */}
                  {parentProducts.length > 0 && (activeTab === "all" || activeTab === "parents") && (
                    <div className="mb-6">
                      {activeTab !== "parents" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Produits avec variantes ({parentProducts.length})
                        </h3>
                      )}
                      
                      <div className="space-y-4">
                        {parentProducts.map(product => renderParentProductCard(product))}
                      </div>
                    </div>
                  )}
                  
                  {/* Variants */}
                  {getFilteredVariants().length > 0 && (activeTab === "all" || activeTab === "variants") && (
                    <div className="mb-6">
                      {activeTab !== "variants" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Variantes ({getFilteredVariants().length})
                        </h3>
                      )}
                      
                      <div className="space-y-2">
                        {getFilteredVariants().map(variant => renderVariantCard(variant))}
                      </div>
                    </div>
                  )}
                  
                  {/* Standalone Products */}
                  {standaloneProducts.length > 0 && (activeTab === "all" || activeTab === "standalone") && (
                    <div className="mb-6">
                      {activeTab !== "standalone" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Produits individuels ({standaloneProducts.length})
                        </h3>
                      )}
                      
                      <div className="space-y-2">
                        {standaloneProducts.map(product => renderStandaloneProductCard(product))}
                      </div>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {parentProducts.length === 0 && 
                   standaloneProducts.length === 0 && 
                   getFilteredVariants().length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      Aucun produit trouvé
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
