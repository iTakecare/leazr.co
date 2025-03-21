
import React, { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product, ProductAttributes } from "@/types/catalog";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: Product) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [showVariants, setShowVariants] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  
  // State for expanded product parents
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  
  // Structured data for parent products and their variants
  const [parentProducts, setParentProducts] = useState<Map<string, Product>>(new Map());
  const [productVariants, setProductVariants] = useState<Map<string, Product[]>>(new Map());
  const [standaloneProducts, setStandaloneProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  // Fetch all data needed for the catalog
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

  // Fetch products from the database
  const fetchProducts = async () => {
    try {
      // First, fetch all products
      const { data: allProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Process products (parse attributes, etc.)
      const processedProducts = allProducts.map(product => ({
        ...product,
        attributes: typeof product.attributes === 'string' 
          ? JSON.parse(product.attributes) 
          : product.attributes
      }));
      
      setProducts(processedProducts);
      
      // Organize products into parents, variants, and standalone
      organizeProducts(processedProducts);
      
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    }
  };
  
  // Organize products into parent products, variants, and standalone products
  const organizeProducts = (productsList: Product[]) => {
    const parents = new Map<string, Product>();
    const variants = new Map<string, Product[]>();
    const standalone: Product[] = [];
    
    // First pass: identify parent products and standalone products
    productsList.forEach(product => {
      if (product.is_parent) {
        parents.set(product.id, product);
        variants.set(product.id, []);
      } else if (!product.parent_id) {
        standalone.push(product);
      }
    });
    
    // Second pass: assign variants to their parents
    productsList.forEach(product => {
      if (product.parent_id && parents.has(product.parent_id)) {
        const parentVariants = variants.get(product.parent_id) || [];
        parentVariants.push(product);
        variants.set(product.parent_id, parentVariants);
      }
    });
    
    // Update state
    setParentProducts(parents);
    setProductVariants(variants);
    setStandaloneProducts(standalone);
    
    // Log results for debugging
    console.log(`Found ${parents.size} parent products, ${standalone.length} standalone products`);
    let totalVariants = 0;
    variants.forEach(v => totalVariants += v.length);
    console.log(`Found ${totalVariants} variants`);
  };

  // Fetch categories from the database
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

  // Fetch brands from the database
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

  // Apply filters to products
  useEffect(() => {
    if (products.length > 0) {
      const filteredProducts = applyFilters(products);
      organizeProducts(filteredProducts);
    }
  }, [searchTerm, selectedCategory, selectedBrand, products]);

  // Filter products based on search term, category, and brand
  const applyFilters = (productsList: Product[]) => {
    return productsList.filter(product => {
      // Search filter
      const nameMatch = !searchTerm || 
        (product.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const categoryMatch = selectedCategory === "all" || 
        product.category === selectedCategory;
      
      // Brand filter
      const brandMatch = selectedBrand === "all" || 
        product.brand === selectedBrand;
      
      return nameMatch && categoryMatch && brandMatch;
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

  // Toggle product expansion to show/hide variants
  const toggleProductExpansion = (productId: string) => {
    setExpandedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Check if a product has variants
  const hasVariants = (productId: string): boolean => {
    const variants = productVariants.get(productId);
    return variants !== undefined && variants.length > 0;
  };

  // Get the number of variants for a product
  const getVariantCount = (productId: string): number => {
    const variants = productVariants.get(productId);
    return variants ? variants.length : 0;
  };

  // Render a product card
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    const productId = product.id;
    const isExpanded = expandedProductIds.has(productId);
    const variantCount = getVariantCount(productId);
    
    return (
      <div 
        key={productId} 
        className={`border rounded-md mb-3 overflow-hidden ${isVariant ? 'border-dashed ml-6 bg-gray-50' : ''}`}
      >
        <div className="p-3">
          <div className="flex items-start">
            {product.is_parent && hasVariants(productId) ? (
              <button 
                onClick={() => toggleProductExpansion(productId)}
                className="p-1 mr-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <div className="w-6 mr-2"></div> // Spacer for alignment
            )}
            
            <div 
              className="flex-1 cursor-pointer" 
              onClick={() => handleProductSelect(product)}
            >
              <div className="flex">
                <div className="w-1/3 p-2 flex items-center justify-center bg-gray-100 rounded">
                  <img 
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="object-contain h-16 w-16"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                
                <div className="w-2/3 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    {product.is_parent && (
                      <Badge variant="outline" className="text-xs">Parent</Badge>
                    )}
                    {isVariant && (
                      <Badge variant="outline" className="text-xs">Variante</Badge>
                    )}
                  </div>
                  
                  {product.attributes && Object.keys(product.attributes).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatAttributes(product.attributes as ProductAttributes)}
                    </p>
                  )}
                  
                  <div className="text-sm mt-2">
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
        </div>
        
        {/* Render variants if this product has them and is expanded */}
        {product.is_parent && hasVariants(productId) && isExpanded && showVariants && (
          <div className="border-t pt-2 pb-2 px-3">
            <p className="text-xs text-muted-foreground mb-2 ml-6">
              Variantes disponibles ({variantCount}):
            </p>
            <div className="space-y-2">
              {productVariants.get(productId)?.map(variant => (
                <div 
                  key={variant.id}
                  className="border border-dashed rounded-md p-3 ml-6 bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => handleProductSelect(variant)}
                    >
                      <div className="flex">
                        <div className="w-1/4 p-2 flex items-center justify-center bg-gray-100 rounded">
                          <img 
                            src={variant.image_url || "/placeholder.svg"}
                            alt={variant.name}
                            className="object-contain h-12 w-12"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        
                        <div className="w-3/4 p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{variant.name}</h3>
                            <Badge variant="outline" className="text-xs">Variante</Badge>
                          </div>
                          
                          {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                            <p className="text-xs text-gray-500">
                              {formatAttributes(variant.attributes as ProductAttributes)}
                            </p>
                          )}
                          
                          <div className="text-sm mt-1">
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
    );
  };

  // Calculate counts for display
  const getParentProductCount = () => parentProducts.size;
  const getParentProductsWithVariantsCount = () => {
    let count = 0;
    parentProducts.forEach((_, id) => {
      if (hasVariants(id)) count++;
    });
    return count;
  };
  const getStandaloneProductCount = () => standaloneProducts.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
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
        
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="show-variants"
            checked={showVariants}
            onCheckedChange={setShowVariants}
          />
          <Label htmlFor="show-variants" className="cursor-pointer">
            Afficher les variantes
          </Label>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {getParentProductCount() === 0 && getStandaloneProductCount() === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
                </div>
              )}
              
              {/* Products with variants */}
              {getParentProductsWithVariantsCount() > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits avec variantes ({getParentProductsWithVariantsCount()})
                  </h3>
                  
                  <div className="space-y-2">
                    {Array.from(parentProducts.values())
                      .filter(parent => hasVariants(parent.id))
                      .map(parent => renderProductCard(parent))}
                  </div>
                </div>
              )}
              
              {/* Parent products without variants */}
              {Array.from(parentProducts.values()).filter(parent => !hasVariants(parent.id)).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits parents sans variantes ({
                      Array.from(parentProducts.values()).filter(parent => !hasVariants(parent.id)).length
                    })
                  </h3>
                  
                  <div className="space-y-2">
                    {Array.from(parentProducts.values())
                      .filter(parent => !hasVariants(parent.id))
                      .map(parent => renderProductCard(parent))}
                  </div>
                </div>
              )}
              
              {/* Standalone products */}
              {standaloneProducts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits individuels ({standaloneProducts.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {standaloneProducts.map(product => renderProductCard(product))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
