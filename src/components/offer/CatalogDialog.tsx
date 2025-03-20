
import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "@/components/ui/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Product, ProductAttributes } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { parseAttributes } from "@/services/catalogService";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  // Fetch products and their variants directly from Supabase
  const fetchProducts = async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      console.log("Fetching products from Supabase...");
      
      // Fetch parent products first
      const { data: parentProducts, error: parentError } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (parentError) {
        throw parentError;
      }
      
      // Process parent products
      const processedParentProducts = parentProducts.map(product => ({
        ...product,
        attributes: parseAttributes(product.attributes)
      }));
      
      // Now fetch all variant products
      const { data: variantProducts, error: variantError } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: false });
        
      if (variantError) {
        throw variantError;
      }
      
      // Process variant products
      const processedVariantProducts = variantProducts.map(product => ({
        ...product,
        attributes: parseAttributes(product.attributes)
      }));
      
      // Combine both sets of products
      const allProducts = [...processedParentProducts, ...processedVariantProducts];
      
      console.log(`Successfully fetched ${allProducts.length} products`);
      setProducts(allProducts || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories directly from Supabase
  const fetchCategories = async () => {
    if (!isOpen) return;
    
    try {
      console.log("Fetching categories from Supabase...");
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (error) {
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length} categories`);
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Fetch brands directly from Supabase
  const fetchBrands = async () => {
    if (!isOpen) return;
    
    try {
      console.log("Fetching brands from Supabase...");
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
        
      if (error) {
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length} brands`);
      setBrands(data || []);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  // Fetch all data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [isOpen]);

  // Filter products client-side
  const filteredProducts = React.useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    let filtered = products;
    
    // Remove variants if not showing variants
    if (!showVariants) {
      filtered = filtered.filter(product => !product.is_variation);
    }
    
    // Apply filters
    filtered = filtered.filter((product) => {
      // Search term filter
      const nameMatch = !searchTerm || 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const categoryMatch = selectedCategory === "all" || 
        (product.category && product.category === selectedCategory);
      
      // Brand filter
      const brandMatch = selectedBrand === "all" || 
        (product.brand && product.brand === selectedBrand);
      
      return nameMatch && categoryMatch && brandMatch;
    });
    
    return filtered;
  }, [products, searchTerm, selectedCategory, selectedBrand, showVariants]);

  // Group products by model
  const groupedByModel = React.useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return {};
    }
    
    const grouped: Record<string, Product[]> = {};
    
    filteredProducts.forEach(product => {
      if (product.is_parent) {
        // Parent products get their own group
        const modelKey = product.id;
        if (!grouped[modelKey]) {
          grouped[modelKey] = [product];
        }
      } else if (product.parent_id) {
        // Variant products go in their parent's group
        const modelKey = product.parent_id;
        if (!grouped[modelKey]) {
          // Find the parent product
          const parentProduct = filteredProducts.find(p => p.id === product.parent_id);
          if (parentProduct) {
            grouped[modelKey] = [parentProduct, product];
          } else {
            // If parent not in filtered products, create a new group for this variant
            grouped[product.id] = [product];
          }
        } else {
          grouped[modelKey].push(product);
        }
      } else {
        // Standalone products get their own group
        const modelKey = product.model || product.name || product.id;
        if (!grouped[modelKey]) {
          grouped[modelKey] = [product];
        } else {
          grouped[modelKey].push(product);
        }
      }
    });
    
    return grouped;
  }, [filteredProducts]);

  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes) => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
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
        
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-variants"
              checked={showVariants}
              onCheckedChange={setShowVariants}
            />
            <Label htmlFor="show-variants" className="cursor-pointer">
              Afficher les variantes
            </Label>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex flex-col gap-4 my-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : Object.keys(groupedByModel).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedByModel).map(([modelName, modelProducts]) => {
                // Sort products so parent comes first, then variants
                const sortedProducts = [...modelProducts].sort((a, b) => {
                  if (a.is_parent) return -1;
                  if (b.is_parent) return 1;
                  return 0;
                });
                
                // Get parent product for the group heading
                const parentProduct = sortedProducts.find(p => p.is_parent) || sortedProducts[0];
                
                return (
                  <div key={modelName} className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">{parentProduct.name}</h3>
                    
                    <div className="flex flex-col gap-2">
                      {sortedProducts.map((product) => (
                        <div 
                          key={product.id} 
                          onClick={() => handleProductSelect(product)}
                          className={`cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-shadow ${product.is_variation ? 'border-dashed' : ''}`}
                        >
                          <div className="flex p-3">
                            <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
                              <img 
                                src={product.image_url || product.imageUrl || "/placeholder.svg"}
                                alt={product.name}
                                className="object-contain h-16 w-16"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                                }}
                              />
                            </div>
                            <div className="w-2/3 p-3">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">{product.name}</h3>
                                {product.is_parent && (
                                  <Badge variant="outline" className="text-xs">Parent</Badge>
                                )}
                                {product.is_variation && (
                                  <Badge variant="outline" className="text-xs">Variante</Badge>
                                )}
                              </div>
                              
                              {product.is_variation && product.attributes && Object.keys(product.attributes).length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatAttributes(product.attributes as ProductAttributes)}
                                </p>
                              )}
                              
                              <div className="text-sm space-y-1 mt-2">
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
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Aucun produit trouvé
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
