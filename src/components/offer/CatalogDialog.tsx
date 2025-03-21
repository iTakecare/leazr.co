
import React, { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Product, ProductAttributes } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { parseAttributes } from "@/services/catalogService";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New state for expanded product parents
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // New structured data approach
  const [productFamilies, setProductFamilies] = useState<Map<string, Product[]>>(new Map());
  const [standaloneProducts, setStandaloneProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchBrands()
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      console.log("Fetching products...");
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      const processedProducts = data.map(product => ({
        ...product,
        attributes: parseAttributes(product.attributes)
      }));
      
      setProducts(processedProducts);
      organizeProducts(processedProducts);
      
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    }
  };
  
  const organizeProducts = (products: Product[]) => {
    // New approach: use a Map to store parent-variants relationships
    const families = new Map<string, Product[]>();
    const standalone: Product[] = [];
    
    // First, identify all parents and create entries in the map
    products.forEach(product => {
      if (product.is_parent) {
        families.set(product.id, [product]);
      }
    });
    
    // Then, assign variants to their parents or add standalone products
    products.forEach(product => {
      if (product.parent_id && families.has(product.parent_id)) {
        // This is a variant of a parent product
        const family = families.get(product.parent_id) || [];
        family.push(product);
        families.set(product.parent_id, family);
      } else if (!product.is_parent && !product.parent_id) {
        // This is a standalone product
        standalone.push(product);
      }
    });
    
    // Update state
    setProductFamilies(families);
    setStandaloneProducts(standalone);
    
    // Log for debugging
    console.log(`Organized ${families.size} product families and ${standalone.length} standalone products`);
    families.forEach((family, parentId) => {
      console.log(`Family ${parentId} has ${family.length} products (including parent)`);
    });
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setBrands(data || []);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  // Apply filters
  useEffect(() => {
    if (products.length) {
      const filtered = applyFilters(products);
      organizeProducts(filtered);
    }
  }, [searchTerm, selectedCategory, selectedBrand, products]);

  // Filter products based on search term and filters
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
  const formatAttributes = (attributes: ProductAttributes) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return "";
    }
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Toggle product expansion
  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(productId)) {
        newExpanded.delete(productId);
      } else {
        newExpanded.add(productId);
      }
      return newExpanded;
    });
  };

  // Render product card
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    const isParent = product.is_parent;
    const hasVariants = isParent && productFamilies.has(product.id) && productFamilies.get(product.id)!.length > 1;
    const isExpanded = expandedProducts.has(product.id);
    
    return (
      <div key={product.id} className={`border rounded-md mb-3 overflow-hidden ${isVariant ? 'border-dashed ml-6 bg-gray-50' : ''}`}>
        <div className="p-3">
          {hasVariants ? (
            <div className="flex items-start">
              <button 
                onClick={() => toggleProductExpansion(product.id)}
                className="p-1 mr-2 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <div className="flex-1" onClick={() => handleProductSelect(product)}>
                <ProductCardContent product={product} isVariant={isVariant} />
              </div>
            </div>
          ) : (
            <div className="cursor-pointer" onClick={() => handleProductSelect(product)}>
              <ProductCardContent product={product} isVariant={isVariant} />
            </div>
          )}
        </div>
        
        {/* Render variants if this is an expanded parent product */}
        {hasVariants && isExpanded && showVariants && (
          <div className="border-t pt-2 pb-2 px-3">
            <p className="text-xs text-muted-foreground mb-2 ml-6">
              Variantes disponibles ({productFamilies.get(product.id)!.length - 1}):
            </p>
            <div className="space-y-2">
              {productFamilies.get(product.id)!
                .filter(p => p.id !== product.id) // Exclude the parent itself
                .map(variant => (
                  <div 
                    key={variant.id}
                    onClick={() => handleProductSelect(variant)}
                    className="cursor-pointer border border-dashed rounded-md p-3 ml-6 bg-gray-50 hover:bg-gray-100"
                  >
                    <ProductCardContent product={variant} isVariant={true} />
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  // Extracted product card content to a separate component
  const ProductCardContent = ({ product, isVariant }: { product: Product, isVariant: boolean }) => {
    return (
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
            {product.parent_id && (
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
              Prix: {product.price} €
            </p>
            {product.monthly_price > 0 && (
              <p className="text-muted-foreground">
                Mensualité: {product.monthly_price} €
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Count total products for display
  const getTotalProductsCount = () => {
    let count = standaloneProducts.length;
    
    // Add all variants from all families
    productFamilies.forEach(family => {
      count += family.length;
    });
    
    return count;
  };
  
  // Get count of parent products
  const getParentProductsCount = () => {
    return productFamilies.size;
  };
  
  // Get count of products with variants (parents that actually have variants)
  const getProductsWithVariantsCount = () => {
    let count = 0;
    productFamilies.forEach(family => {
      if (family.length > 1) count++; // Only count parents with actual variants
    });
    return count;
  };

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
              {getTotalProductsCount() === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
                </div>
              )}
              
              {/* Products with variants */}
              {getProductsWithVariantsCount() > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits avec variantes ({getProductsWithVariantsCount()})
                  </h3>
                  
                  <div className="space-y-2">
                    {Array.from(productFamilies.entries())
                      .filter(([_, family]) => family.length > 1) // Only show families with variants
                      .map(([parentId, family]) => {
                        const parentProduct = family.find(p => p.id === parentId);
                        if (!parentProduct) return null; // Safety check
                        return renderProductCard(parentProduct);
                      })
                    }
                  </div>
                </div>
              )}
              
              {/* Parents without variants - treat as standalone */}
              {Array.from(productFamilies.entries())
                .filter(([_, family]) => family.length === 1)
                .length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits parents sans variantes ({
                      Array.from(productFamilies.entries())
                        .filter(([_, family]) => family.length === 1)
                        .length
                    })
                  </h3>
                  
                  <div className="space-y-2">
                    {Array.from(productFamilies.entries())
                      .filter(([_, family]) => family.length === 1)
                      .map(([_, family]) => renderProductCard(family[0]))
                    }
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
