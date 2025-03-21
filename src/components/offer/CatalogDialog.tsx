
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
      
      // Fetch all products (both parents and variants)
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (productsError) {
        throw productsError;
      }
      
      // Process all products
      const processedProducts = allProducts.map(product => ({
        ...product,
        attributes: parseAttributes(product.attributes)
      }));
      
      console.log(`Successfully fetched ${processedProducts.length} products`);
      console.log("Product sample:", processedProducts.slice(0, 2));
      
      // Log variant products to debug
      const variants = processedProducts.filter(p => p.parent_id || p.is_variation);
      console.log(`Found ${variants.length} variant products:`, variants.slice(0, 3));
      
      setProducts(processedProducts || []);
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
    
    let filtered = [...products];
    
    // Apply search and category/brand filters
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
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  // Group products by parent/child relationship
  const groupedProducts = React.useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return {};
    }
    
    // Log for debugging
    console.log("Grouping filtered products:", filteredProducts.length);
    
    const grouped: Record<string, Product[]> = {};
    
    // First, identify all parent products
    const parentProducts = filteredProducts.filter(p => p.is_parent);
    console.log(`Found ${parentProducts.length} parent products`);
    
    // Create groups for each parent product
    parentProducts.forEach(parent => {
      grouped[parent.id] = [parent];
    });
    
    // Add standalone products (not parents, not variants)
    const standaloneProducts = filteredProducts.filter(p => !p.is_parent && !p.parent_id);
    console.log(`Found ${standaloneProducts.length} standalone products`);
    
    standaloneProducts.forEach(product => {
      grouped[product.id] = [product];
    });
    
    // Add variants to their parent's group if showVariants is true
    if (showVariants) {
      const variantProducts = filteredProducts.filter(p => p.parent_id);
      console.log(`Found ${variantProducts.length} variants to add to groups`);
      
      variantProducts.forEach(variant => {
        if (variant.parent_id && grouped[variant.parent_id]) {
          grouped[variant.parent_id].push(variant);
        }
      });
    }
    
    // Log the final group structure
    console.log("Final grouped products:", Object.keys(grouped).length);
    for (const [key, group] of Object.entries(grouped)) {
      console.log(`Group ${key}: ${group.length} products`);
    }
    
    return grouped;
  }, [filteredProducts, showVariants]);

  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return "";
    }
    
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
          ) : Object.keys(groupedProducts).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedProducts).map(([groupKey, groupItems]) => {
                // Sort items so parent comes first, then variants
                const sortedItems = [...groupItems].sort((a, b) => {
                  if (a.is_parent) return -1;
                  if (b.is_parent) return 1;
                  return 0;
                });
                
                // Get the main product for the group (typically the parent)
                const mainProduct = sortedItems[0];
                
                return (
                  <div key={groupKey} className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      {mainProduct.name}
                    </h3>
                    
                    <div className="flex flex-col gap-2">
                      {sortedItems.map((product) => (
                        <div 
                          key={product.id} 
                          onClick={() => handleProductSelect(product)}
                          className={`cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-shadow ${
                            product.is_variation || product.parent_id ? 'border-dashed' : ''
                          }`}
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
                                {(product.is_variation || product.parent_id) && !product.is_parent && (
                                  <Badge variant="outline" className="text-xs">Variante</Badge>
                                )}
                              </div>
                              
                              {(product.is_variation || product.parent_id) && 
                                product.attributes && 
                                Object.keys(product.attributes).length > 0 && (
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
