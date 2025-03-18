
import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, AlertTriangle, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PackCatalogProps {
  selectedPack: string;
  onSelectHardware: (category: string, productId: string) => void;
  onQuantityChange: (category: string, quantity: number) => void;
  selectedHardware: {
    laptop: string | null;
    desktop: string | null;
    mobile: string | null;
    tablet: string | null;
  };
  quantities: {
    laptop: number;
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

const PackCatalog: React.FC<PackCatalogProps> = ({
  selectedPack,
  onSelectHardware,
  onQuantityChange,
  selectedHardware,
  quantities
}) => {
  const [products, setProducts] = useState<{
    laptop: Product[];
    desktop: Product[];
    mobile: Product[];
    tablet: Product[];
  }>({
    laptop: [],
    desktop: [],
    mobile: [],
    tablet: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noProductsFound, setNoProductsFound] = useState(false);
  
  const packPriceRanges = {
    silver: { min: 0, max: 650 },
    gold: { min: 651, max: 1500 },
    platinum: { min: 1501, max: 2500 }
  };
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        setNoProductsFound(false);
        
        console.log(`Fetching products for ${selectedPack} pack...`);
        
        const supabase = getSupabaseClient();
        
        // Utiliser une requête qui ne nécessite pas d'authentification
        // Nous utilisons la clé anonyme par défaut qui permet les lectures publiques
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);
          
        if (error) {
          console.error("Error fetching products:", error);
          setError("Impossible de récupérer les produits depuis la base de données");
          return;
        }
        
        if (!data || data.length === 0) {
          console.log("No products found in database");
          setNoProductsFound(true);
          return;
        }
        
        console.log(`Successfully loaded ${data.length} products from database`);
        
        // Filter by price range based on selected pack
        const priceRange = packPriceRanges[selectedPack as keyof typeof packPriceRanges];
        const filteredData = data.filter(product => {
          const productPrice = product.price || 0;
          return productPrice >= priceRange.min && productPrice <= priceRange.max;
        });
        
        console.log(`Filtered to ${filteredData.length} products in price range for ${selectedPack} pack`);
        
        if (filteredData.length === 0) {
          setNoProductsFound(true);
          return;
        }
        
        // Categorize products
        const categorizedProducts = {
          laptop: filteredData.filter(p => p.category === 'laptop'),
          desktop: filteredData.filter(p => p.category === 'desktop'),
          mobile: filteredData.filter(p => p.category === 'smartphone'),
          tablet: filteredData.filter(p => p.category === 'tablet')
        };
        
        console.log("Categorized products:", {
          laptops: categorizedProducts.laptop.length,
          desktops: categorizedProducts.desktop.length,
          mobiles: categorizedProducts.mobile.length,
          tablets: categorizedProducts.tablet.length
        });
        
        setProducts(categorizedProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Une erreur s'est produite lors de la récupération des produits");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedPack]);
  
  const categories = [
    { id: "laptop", label: "Ordinateur portable", icon: <Laptop className="h-5 w-5" />, products: products.laptop },
    { id: "desktop", label: "Ordinateur fixe", icon: <Monitor className="h-5 w-5" />, products: products.desktop },
    { id: "mobile", label: "Smartphone", icon: <Smartphone className="h-5 w-5" />, products: products.mobile },
    { id: "tablet", label: "Tablette", icon: <Tablet className="h-5 w-5" />, products: products.tablet },
  ];
  
  const handleQuantityChange = (category: string, change: number) => {
    const currentQuantity = quantities[category as keyof typeof quantities] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    onQuantityChange(category, newQuantity);
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <div className="bg-gray-50 p-4 flex items-center justify-between border-b">
              <div className="flex items-center space-x-3">
                {category.icon}
                <h3 className="font-medium">{category.label}</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert className="bg-red-50 border-red-300 text-red-800">
        <AlertTriangle className="h-5 w-5 text-red-800" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (noProductsFound) {
    return (
      <Alert className="bg-yellow-50 border-yellow-300 text-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-800" />
        <AlertTitle>Aucun produit trouvé</AlertTitle>
        <AlertDescription>
          Aucun produit n'a été trouvé dans la base de données pour le pack {selectedPack.toUpperCase()}.
          <br />
          Veuillez vérifier que des produits sont ajoutés dans la base de données et qu'ils correspondent à la plage de prix de ce pack.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {categories.map((category) => (
        <Card key={category.id} className="overflow-hidden">
          <div className="bg-gray-50 p-4 flex items-center justify-between border-b">
            <div className="flex items-center space-x-3">
              {category.icon}
              <h3 className="font-medium">{category.label}</h3>
            </div>
          </div>
          <CardContent className="p-4">
            {category.products.length > 0 ? (
              <ScrollArea className="h-64 pr-4">
                <RadioGroup
                  value={selectedHardware[category.id as keyof typeof selectedHardware] || ""}
                  onValueChange={(value) => onSelectHardware(category.id, value)}
                >
                  <div className="space-y-4">
                    {category.products.map((product) => (
                      <div 
                        key={product.id} 
                        className="flex items-center justify-between pb-3 last:border-0 last:pb-0 border-b"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem 
                            value={product.id} 
                            id={`${category.id}-${product.id}`}
                            disabled={quantities[category.id as keyof typeof quantities] === 0}
                          />
                          <div>
                            <Label 
                              htmlFor={`${category.id}-${product.id}`} 
                              className={`text-sm leading-snug cursor-pointer ${
                                quantities[category.id as keyof typeof quantities] === 0 ? 'text-gray-400' : ''
                              }`}
                            >
                              {product.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {product.price && `${product.price}€`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(category.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            className="w-12 text-center h-7 px-1"
                            value={quantities[category.id as keyof typeof quantities] || 0}
                            readOnly
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(category.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </ScrollArea>
            ) : (
              <div className="text-sm text-gray-500 italic p-4">
                Aucun produit disponible dans cette catégorie pour cette formule
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PackCatalog;
