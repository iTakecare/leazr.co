
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

  // Organizes products into a map of parent products with their variants
  const organizedProducts = React.useMemo(() => {
    // Group products by parent/variant structure
    const parentsMap: Map<string, Product> = new Map();
    const variantsMap: Map<string, Product[]> = new Map();
    const standaloneProducts: Product[] = [];
    
    // First pass: identify parents, variants, and standalone products
    filteredProducts.forEach(product => {
      if (product.is_parent) {
        parentsMap.set(product.id, product);
        variantsMap.set(product.id, []);
      } else if (product.parent_id) {
        const variants = variantsMap.get(product.parent_id) || [];
        variants.push(product);
        variantsMap.set(product.parent_id, variants);
      } else {
        standaloneProducts.push(product);
      }
    });
    
    // Log what we found
    console.log(`Organized ${parentsMap.size} parent products`);
    console.log(`Found variants for ${variantsMap.size} parent products`);
    console.log(`Found ${standaloneProducts.length} standalone products`);
    
    // For debugging: log each parent and how many variants it has
    parentsMap.forEach((parent, parentId) => {
      const variants = variantsMap.get(parentId) || [];
      console.log(`Parent "${parent.name}" (${parentId}) has ${variants.length} variants`);
      
      // Log first variant details if available
      if (variants.length > 0) {
        const firstVariant = variants[0];
        console.log(`- First variant: "${firstVariant.name}" (${firstVariant.id})`);
        console.log(`- Variant attributes:`, firstVariant.attributes);
      }
    });
    
    return {
      parents: parentsMap,
      variants: variantsMap,
      standalone: standaloneProducts
    };
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

  // Render a product card (for both parent and variants)
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    return (
      <div 
        key={product.id} 
        onClick={() => handleProductSelect(product)}
        className={`cursor-pointer border ${isVariant ? 'border-dashed ml-4' : ''} rounded-md overflow-hidden hover:shadow-md transition-shadow`}
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

  // Render the product list with parent/variant hierarchy
  const renderProductList = () => {
    const { parents, variants, standalone } = organizedProducts;
    
    if (parents.size === 0 && standalone.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          Aucun produit trouvé
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Render parent products with their variants */}
        {Array.from(parents.values()).map(parent => (
          <div key={parent.id} className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              {parent.name}
            </h3>
            
            <div className="flex flex-col gap-2">
              {/* Parent product */}
              {renderProductCard(parent)}
              
              {/* Variants (if showVariants is enabled) */}
              {showVariants && 
                variants.get(parent.id)?.map(variant => 
                  renderProductCard(variant, true)
                )
              }
            </div>
          </div>
        ))}
        
        {/* Render standalone products */}
        {standalone.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              Produits individuels
            </h3>
            
            <div className="flex flex-col gap-2">
              {standalone.map(product => renderProductCard(product))}
            </div>
          </div>
        )}
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
            renderProductList()
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
