
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
      
      // Log parent-child relationships to debug
      const parentProducts = processedProducts.filter(p => p.is_parent);
      console.log(`Found ${parentProducts.length} parent products`);
      
      const variantProducts = processedProducts.filter(p => p.parent_id);
      console.log(`Found ${variantProducts.length} variant products with parent_id`);
      
      // Log each parent product and its variants
      parentProducts.forEach(parent => {
        const variants = variantProducts.filter(v => v.parent_id === parent.id);
        console.log(`Parent product "${parent.name}" (${parent.id}) has ${variants.length} variants`);
        if (variants.length > 0) {
          console.log(`First variant: "${variants[0].name}" (${variants[0].id})`);
        }
      });
      
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

  // Render the products organized by parent/variant relationships
  const renderProducts = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          Aucun produit trouvé
        </div>
      );
    }
    
    // First, identify parent products and standalone products (products without parent or children)
    const parentProducts = filteredProducts.filter(p => p.is_parent);
    const standaloneProducts = filteredProducts.filter(p => !p.is_parent && !p.parent_id);
    
    // Create a map of parent IDs to their variant products
    const variantMap = new Map<string, Product[]>();
    
    filteredProducts.forEach(product => {
      if (product.parent_id) {
        const variants = variantMap.get(product.parent_id) || [];
        variants.push(product);
        variantMap.set(product.parent_id, variants);
      }
    });
    
    // Log parent-variant relationships
    console.log(`Rendering ${parentProducts.length} parent products`);
    console.log(`Rendering ${standaloneProducts.length} standalone products`);
    console.log(`Found variants for ${variantMap.size} parent products`);
    
    // Render each parent product followed by its variants if showVariants is true
    return (
      <div className="space-y-6">
        {/* Render parent products with their variants */}
        {parentProducts.map(parent => {
          const variants = variantMap.get(parent.id) || [];
          console.log(`Rendering parent "${parent.name}" with ${variants.length} variants`);
          
          return (
            <div key={parent.id} className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                {parent.name}
              </h3>
              
              <div className="flex flex-col gap-2">
                {/* Parent product */}
                <div 
                  key={parent.id} 
                  onClick={() => handleProductSelect(parent)}
                  className="cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex p-3">
                    <div className="w-1/3 bg-gray-100 h-full flex items-center justify-center p-2">
                      <img 
                        src={parent.image_url || parent.imageUrl || "/placeholder.svg"}
                        alt={parent.name}
                        className="object-contain h-16 w-16"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="w-2/3 p-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{parent.name}</h3>
                        <Badge variant="outline" className="text-xs">Parent</Badge>
                      </div>
                      
                      <div className="text-sm space-y-1 mt-2">
                        <p className="text-muted-foreground">
                          Prix: {parent.price} €
                        </p>
                        {parent.monthly_price > 0 && (
                          <p className="text-muted-foreground">
                            Mensualité: {parent.monthly_price} €
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Variants */}
                {showVariants && variants.length > 0 && (
                  <div className="ml-4 space-y-2">
                    {variants.map(variant => (
                      <div 
                        key={variant.id} 
                        onClick={() => handleProductSelect(variant)}
                        className="cursor-pointer border border-dashed rounded-md overflow-hidden hover:shadow-md transition-shadow"
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
                )}
              </div>
            </div>
          );
        })}
        
        {/* Render standalone products */}
        {standaloneProducts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              Produits individuels
            </h3>
            
            <div className="flex flex-col gap-2">
              {standaloneProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => handleProductSelect(product)}
                  className="cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-shadow"
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
                      <h3 className="font-medium text-sm">{product.name}</h3>
                      
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
        )}
      </div>
    );
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
            Afficher les variantes ({showVariants ? 'Oui' : 'Non'})
          </Label>
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex flex-col gap-4 my-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            renderProducts()
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
