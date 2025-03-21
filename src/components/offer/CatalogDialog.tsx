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
      const variants = processedProducts.filter(p => p.parent_id);
      console.log(`Found ${variants.length} variant products with parent_id:`, variants.slice(0, 3));
      
      const variationsFlag = processedProducts.filter(p => p.is_variation);
      console.log(`Found ${variationsFlag.length} products with is_variation flag:`, variationsFlag.slice(0, 3));
      
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
    
    console.log("Grouping filtered products:", filteredProducts.length);
    
    // This will hold our grouped products
    const grouped: Record<string, Product[]> = {};
    
    // First pass: Add all parent products and standalone products to groups
    filteredProducts.forEach(product => {
      // If it's a parent product, create a group for it
      if (product.is_parent) {
        grouped[product.id] = [product];
      } 
      // If it's a standalone product (not a parent and not a variant), create its own group
      else if (!product.is_parent && !product.parent_id) {
        grouped[product.id] = [product];
      }
    });
    
    // Second pass: Add variants to their parent's group if showVariants is true
    if (showVariants) {
      filteredProducts.forEach(product => {
        // If it has a parent_id, it's a variant
        if (product.parent_id) {
          // Add it to the parent's group if the parent exists in our grouped object
          if (grouped[product.parent_id]) {
            grouped[product.parent_id].push(product);
          } else {
            // If parent isn't in our groups (maybe filtered out), add as standalone
            grouped[product.id] = [product];
          }
        }
      });
    }
    
    console.log("Final grouped products:", Object.keys(grouped).length);
    
    // Log a sample of the groups to check structure
    const sampleKeys = Object.keys(grouped).slice(0, 3);
    sampleKeys.forEach(key => {
      console.log(`Group ${key}: ${grouped[key].length} products`, 
        grouped[key].map(p => ({ id: p.id, name: p.name, isParent: p.is_parent, parentId: p.parent_id })));
    });
    
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
              Afficher les variantes ({showVariants ? 'Oui' : 'Non'})
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
                // Get the main product for the group (typically the parent)
                const mainProduct = groupItems.find(p => p.is_parent) || groupItems[0];
                const variants = groupItems.filter(p => p.id !== mainProduct.id);
                
                console.log(`Rendering group ${groupKey}:`, {
                  mainProduct: mainProduct.name,
                  variantsCount: variants.length,
                  showVariants
                });
                
                return (
                  <div key={groupKey} className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      {mainProduct.name}
                    </h3>
                    
                    <div className="flex flex-col gap-2">
                      {/* Main product */}
                      <div 
                        key={mainProduct.id} 
                        onClick={() => handleProductSelect(mainProduct)}
                        className="cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="flex p-3">
                          <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
                            <img 
                              src={mainProduct.image_url || mainProduct.imageUrl || "/placeholder.svg"}
                              alt={mainProduct.name}
                              className="object-contain h-16 w-16"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="w-2/3 p-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">{mainProduct.name}</h3>
                              {mainProduct.is_parent && (
                                <Badge variant="outline" className="text-xs">Parent</Badge>
                              )}
                            </div>
                            
                            <div className="text-sm space-y-1 mt-2">
                              <p className="text-muted-foreground">
                                Prix: {mainProduct.price} €
                              </p>
                              {mainProduct.monthly_price > 0 && (
                                <p className="text-muted-foreground">
                                  Mensualité: {mainProduct.monthly_price} €
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Variants */}
                      {showVariants && variants.length > 0 && variants.map(variant => (
                        <div 
                          key={variant.id} 
                          onClick={() => handleProductSelect(variant)}
                          className="cursor-pointer border border-dashed rounded-md overflow-hidden hover:shadow-md transition-shadow ml-4"
                        >
                          <div className="flex p-3">
                            <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
                              <img 
                                src={variant.image_url || variant.imageUrl || "/placeholder.svg"}
                                alt={variant.name}
                                className="object-contain h-16 w-16"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                                }}
                              />
                            </div>
                            <div className="w-2/3 p-3">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">{variant.name}</h3>
                                <Badge variant="outline" className="text-xs">Variante</Badge>
                              </div>
                              
                              {variant.attributes && 
                                Object.keys(variant.attributes).length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatAttributes(variant.attributes as ProductAttributes)}
                                </p>
                              )}
                              
                              <div className="text-sm space-y-1 mt-2">
                                <p className="text-muted-foreground">
                                  Prix: {variant.price} €
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
