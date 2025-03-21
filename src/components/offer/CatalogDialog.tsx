
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

interface ProductFamily {
  parent: Product;
  variants: Product[];
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  
  // Organized data
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([]);
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

  // Fetch and organize products
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
          : product.attributes
      }));
      
      setAllProducts(processedProducts);
      organizeProducts(processedProducts);
      
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    }
  };
  
  // Organize products into families (parent + variants)
  const organizeProducts = (products: Product[]) => {
    const families: ProductFamily[] = [];
    const standalone: Product[] = [];
    const parentMap = new Map<string, Product>();
    
    // First, identify all parent products
    products.forEach(product => {
      if (product.is_parent) {
        parentMap.set(product.id, product);
      }
    });
    
    // Then organize products into families or standalone
    products.forEach(product => {
      if (product.is_parent) {
        // Initialize the family with the parent product
        families.push({
          parent: product,
          variants: []
        });
      } else if (product.parent_id && parentMap.has(product.parent_id)) {
        // Find the family and add this variant to it
        const familyIndex = families.findIndex(f => f.parent.id === product.parent_id);
        if (familyIndex !== -1) {
          families[familyIndex].variants.push(product);
        }
      } else if (!product.parent_id) {
        // This is a standalone product
        standalone.push(product);
      }
    });
    
    setProductFamilies(families);
    setStandaloneProducts(standalone);
    
    console.log(`Organized ${families.length} product families and ${standalone.length} standalone products`);
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
  
  // Apply filters to products when search, category, or brand changes
  useEffect(() => {
    if (allProducts.length > 0) {
      const filteredProducts = applyFilters(allProducts);
      organizeProducts(filteredProducts);
    }
  }, [searchTerm, selectedCategory, selectedBrand, allProducts, activeTab]);

  // Filter products based on search term, category, and brand
  const applyFilters = (products: Product[]) => {
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
      
      // Tab filter - Skip this filter if we're on the "all" tab
      const tabMatch = activeTab === "all" || 
        (activeTab === "parents" && product.is_parent) ||
        (activeTab === "variants" && !product.is_parent && product.parent_id) ||
        (activeTab === "standalone" && !product.is_parent && !product.parent_id);
      
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
  const toggleFamilyExpansion = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };
  
  // Get filtered families based on current tab
  const getFilteredFamilies = () => {
    if (activeTab === "variants") return [];
    
    return productFamilies.filter(family => {
      // For the "variants" tab, we don't show any families
      if (activeTab === "variants") return false;
      
      // For the "all" tab, show all families
      if (activeTab === "all") return true;
      
      // For the "parents" tab, show families with variants
      if (activeTab === "parents") return family.variants.length > 0;
      
      // For the "standalone" tab, no families should be shown
      return false;
    });
  };
  
  // Get filtered standalone products based on current tab
  const getFilteredStandaloneProducts = () => {
    if (activeTab === "parents" || activeTab === "variants") return [];
    return standaloneProducts;
  };
  
  // Get all variants from all families (for the variants tab)
  const getAllVariants = () => {
    if (activeTab !== "variants") return [];
    
    const allVariants: Product[] = [];
    productFamilies.forEach(family => {
      allVariants.push(...family.variants);
    });
    return allVariants;
  };

  // Render a product card
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    return (
      <Card key={product.id} className={`mb-3 overflow-hidden transition-all hover:bg-gray-50 ${isVariant ? 'border-dashed' : ''}`}>
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
                {product.is_parent && (
                  <Badge variant="outline" className="text-xs">Parent</Badge>
                )}
                {isVariant && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Variante</Badge>
                )}
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

  // Render a product family (parent + variants)
  const renderProductFamily = (family: ProductFamily) => {
    const { parent, variants } = family;
    const isExpanded = expandedFamilies.has(parent.id);
    
    return (
      <div key={parent.id} className="mb-4">
        <div 
          className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition-all"
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-4 flex items-center justify-center">
                <img 
                  src={parent.image_url || "/placeholder.svg"}
                  alt={parent.name}
                  className="object-contain max-h-20 max-w-20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{parent.name}</h3>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Parent</Badge>
                </div>
                
                {parent.attributes && Object.keys(parent.attributes).length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatAttributes(parent.attributes as ProductAttributes)}
                  </p>
                )}
                
                <div className="text-sm mt-2 flex flex-wrap gap-x-4">
                  <p className="text-muted-foreground">
                    Prix: {parent.price || 0} €
                  </p>
                  {parent.monthly_price > 0 && (
                    <p className="text-muted-foreground">
                      Mensualité: {parent.monthly_price} €
                    </p>
                  )}
                </div>
                
                {variants.length > 0 && (
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleFamilyExpansion(parent.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} className="mr-1" />
                          Masquer les variantes ({variants.length})
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} className="mr-1" />
                          Afficher les variantes ({variants.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleProductSelect(parent)}
              >
                <Plus size={18} />
              </Button>
            </div>
          </div>
          
          {variants.length > 0 && isExpanded && (
            <div className="border-t bg-gray-50 p-3">
              <h4 className="text-sm font-medium mb-2 text-gray-600 pl-2">Variantes disponibles:</h4>
              <div className="space-y-2">
                {variants.map(variant => (
                  <div key={variant.id} className="bg-white border rounded-md p-3">
                    <div className="flex items-center">
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden bg-gray-100 rounded mr-3 flex items-center justify-center">
                        <img 
                          src={variant.image_url || "/placeholder.svg"}
                          alt={variant.name}
                          className="object-contain max-h-12 max-w-12"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm line-clamp-1">{variant.name}</h5>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Variante</Badge>
                        </div>
                        
                        {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {formatAttributes(variant.attributes as ProductAttributes)}
                          </p>
                        )}
                        
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
                        onClick={() => handleProductSelect(variant)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
                  {/* Product Families */}
                  {getFilteredFamilies().length > 0 && (
                    <div className="mb-6">
                      {activeTab !== "parents" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Produits avec variantes ({getFilteredFamilies().length})
                        </h3>
                      )}
                      
                      <div className="space-y-4">
                        {getFilteredFamilies().map(family => renderProductFamily(family))}
                      </div>
                    </div>
                  )}
                  
                  {/* Variants (only in variants tab) */}
                  {activeTab === "variants" && getAllVariants().length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        Variantes ({getAllVariants().length})
                      </h3>
                      
                      <div className="space-y-2">
                        {getAllVariants().map(variant => renderProductCard(variant, true))}
                      </div>
                    </div>
                  )}
                  
                  {/* Standalone Products */}
                  {getFilteredStandaloneProducts().length > 0 && (
                    <div className="mb-6">
                      {activeTab !== "standalone" && (
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Produits individuels ({getFilteredStandaloneProducts().length})
                        </h3>
                      )}
                      
                      <div className="space-y-2">
                        {getFilteredStandaloneProducts().map(product => renderProductCard(product))}
                      </div>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {getFilteredFamilies().length === 0 && 
                   getFilteredStandaloneProducts().length === 0 && 
                   getAllVariants().length === 0 && (
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
