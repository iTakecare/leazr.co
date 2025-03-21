
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
  
  // Structured data for display
  const [parentProducts, setParentProducts] = useState<Product[]>([]);
  const [variantsMap, setVariantsMap] = useState<Map<string, Product[]>>(new Map());
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
      organizeProdcuts(processedProducts);
      
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Erreur lors du chargement des produits");
    }
  };
  
  const organizeProdcuts = (products: Product[]) => {
    // Reset structures
    const parents: Product[] = [];
    const variants = new Map<string, Product[]>();
    const standalone: Product[] = [];
    
    // First separate parents and standalone products
    products.forEach(product => {
      if (product.is_parent) {
        parents.push(product);
        variants.set(product.id, []);
      } else if (!product.parent_id) {
        standalone.push(product);
      }
    });
    
    // Then assign variants to their parents
    products.forEach(product => {
      if (product.parent_id && variants.has(product.parent_id)) {
        const parentVariants = variants.get(product.parent_id) || [];
        parentVariants.push(product);
        variants.set(product.parent_id, parentVariants);
      }
    });
    
    // Update state
    setParentProducts(parents);
    setVariantsMap(variants);
    setStandaloneProducts(standalone);
    
    // Log for debugging
    console.log(`Found ${parents.length} parent products`);
    console.log(`Found ${standalone.length} standalone products`);
    let totalVariants = 0;
    parents.forEach(parent => {
      const count = variants.get(parent.id)?.length || 0;
      totalVariants += count;
      console.log(`Parent "${parent.name}" has ${count} variants`);
    });
    console.log(`Found ${totalVariants} total variant products`);
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

  // Filter products based on search term and filters
  const applyFilters = () => {
    if (!products.length) return;
    
    const filtered = products.filter(product => {
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
    
    organizeProdcuts(filtered);
  };
  
  // Apply filters when search or filters change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, selectedBrand]);

  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return "";
    }
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  // Render the product card UI
  const renderProductCard = (product: Product, isVariant: boolean = false) => {
    return (
      <div 
        key={product.id} 
        onClick={() => handleProductSelect(product)}
        className={`cursor-pointer border ${isVariant ? 'border-dashed ml-6 bg-gray-50' : ''} rounded-md overflow-hidden hover:shadow-md transition-shadow mb-3`}
      >
        <div className="flex p-3">
          <div className="w-1/3 p-2 flex items-center justify-center bg-gray-100">
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
      </div>
    );
  };
  
  const hasVariants = (productId: string): boolean => {
    const variants = variantsMap.get(productId) || [];
    return variants.length > 0;
  };

  // Render each parent product with its variants
  const renderParentWithVariants = (parent: Product) => {
    const variants = variantsMap.get(parent.id) || [];
    const variantsCount = variants.length;
    
    return (
      <div key={parent.id} className="border rounded-md p-4 mb-4">
        {renderProductCard(parent)}
        
        {showVariants && variantsCount > 0 && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 ml-6">
              Variantes disponibles ({variantsCount}):
            </p>
            <div className="space-y-2">
              {variants.map(variant => renderProductCard(variant, true))}
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
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parent products with variants */}
              {parentProducts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Produits avec variantes ({parentProducts.length})
                  </h3>
                  
                  {parentProducts.map(parent => renderParentWithVariants(parent))}
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
              
              {/* No products found message */}
              {parentProducts.length === 0 && standaloneProducts.length === 0 && (
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
