
import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
      
      // Count parent and variant products
      const parentProducts = processedProducts.filter(p => p.is_parent);
      const variantProducts = processedProducts.filter(p => p.parent_id);
      const standaloneProducts = processedProducts.filter(p => !p.is_parent && !p.parent_id);
      
      console.log(`Found ${parentProducts.length} parent products`);
      console.log(`Found ${variantProducts.length} variant products with parent_id`);
      console.log(`Found ${standaloneProducts.length} standalone products`);
      
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

  // Group products by parent/variant structure
  const groupedProducts = React.useMemo(() => {
    const result: {
      parents: Product[];
      variantGroups: Map<string, Product[]>;
      standalone: Product[];
    } = {
      parents: [],
      variantGroups: new Map(),
      standalone: [],
    };
    
    // First separate products into parent, variant, or standalone
    filteredProducts.forEach(product => {
      if (product.is_parent) {
        result.parents.push(product);
        // Initialize empty array for variants
        result.variantGroups.set(product.id, []);
      } else if (product.parent_id) {
        // Add variant to its parent's group (create if not exists)
        const variants = result.variantGroups.get(product.parent_id) || [];
        variants.push(product);
        result.variantGroups.set(product.parent_id, variants);
      } else {
        result.standalone.push(product);
      }
    });
    
    // Count products by type
    console.log(`Grouped ${result.parents.length} parent products`);
    console.log(`Grouped ${result.standalone.length} standalone products`);
    console.log(`Found variants for ${result.variantGroups.size} parent products`);
    
    // Log each parent's variants
    result.variantGroups.forEach((variants, parentId) => {
      const parent = result.parents.find(p => p.id === parentId);
      if (parent) {
        console.log(`Parent "${parent.name}" (${parentId}) has ${variants.length} variants`);
      }
    });
    
    return result;
  }, [filteredProducts]);

  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return "";
    }
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Render a product card
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    return (
      <div 
        key={product.id} 
        onClick={() => handleProductSelect(product)}
        className={`cursor-pointer border ${isVariant ? 'border-dashed ml-4 bg-gray-50' : ''} rounded-md overflow-hidden hover:shadow-md transition-shadow mb-2`}
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
              {product.is_parent && <Badge variant="outline" className="text-xs">Parent</Badge>}
              {product.parent_id && <Badge variant="outline" className="text-xs">Variante</Badge>}
            </div>
            
            {product.attributes && 
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
    );
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
            <div className="space-y-6">
              {/* Parent products with their variants */}
              {groupedProducts.parents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits avec variantes ({groupedProducts.parents.length})
                  </h3>
                  
                  {groupedProducts.parents.map(parent => {
                    const variants = groupedProducts.variantGroups.get(parent.id) || [];
                    
                    return (
                      <div key={parent.id} className="space-y-2 border-b pb-4">
                        {renderProductCard(parent)}
                        
                        {showVariants && variants.length > 0 && (
                          <div className="pl-4 space-y-2">
                            {variants.map(variant => renderProductCard(variant, true))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Standalone products */}
              {groupedProducts.standalone.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits individuels ({groupedProducts.standalone.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {groupedProducts.standalone.map(product => renderProductCard(product))}
                  </div>
                </div>
              )}
              
              {/* No products found message */}
              {groupedProducts.parents.length === 0 && groupedProducts.standalone.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
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
