
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
  const [showVariants, setShowVariants] = useState<boolean>(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch products directly from Supabase
  const fetchProducts = async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      console.log("Fetching products from Supabase...");
      
      // Use anon key directly (the supabase client already has this configured)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length} products`);
      
      // Process products to ensure consistent format
      const processedProducts = data.map(product => ({
        ...product,
        attributes: parseAttributes(product.attributes)
      }));
      
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
      const modelKey = product.model || product.name;
      if (!grouped[modelKey]) {
        grouped[modelKey] = [];
      }
      grouped[modelKey].push(product);
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
          <label className="flex items-center cursor-pointer space-x-2">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4"
              checked={showVariants}
              onChange={(e) => setShowVariants(e.target.checked)}
            />
            <span className="text-sm">Afficher les variantes</span>
          </label>
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
              {Object.entries(groupedByModel).map(([modelName, modelProducts]) => (
                <div key={modelName} className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">{modelName}</h3>
                  
                  <div className="flex flex-col gap-2">
                    {modelProducts.map((product) => (
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
                              {product.monthly_price && (
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
              ))}
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
