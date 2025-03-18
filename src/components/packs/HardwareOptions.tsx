
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Laptop, Monitor, Smartphone, Tablet, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { Input } from "@/components/ui/input";

interface HardwareOptionsProps {
  options: {
    laptop: string[];
    desktop: string[];
    mobile: string[];
    tablet: string[];
  };
  selectedPack: string;
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
  onSelect: (category: string, option: string) => void;
  onQuantityChange: (category: string, quantity: number) => void;
}

const HardwareOptions: React.FC<HardwareOptionsProps> = ({
  options,
  selectedPack,
  selectedHardware,
  quantities,
  onSelect,
  onQuantityChange
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
  
  const [productQuantities, setProductQuantities] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);

  // Define price ranges for each pack tier
  const packPriceRanges = {
    silver: { min: 0, max: 650 },
    gold: { min: 0, max: 1500 },
    platinum: { min: 0, max: 2500 }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);
          
        if (error) {
          console.error("Error fetching products:", error);
          return;
        }
        
        if (data) {
          // Get the price range for the selected pack
          const priceRange = packPriceRanges[selectedPack as keyof typeof packPriceRanges];
          
          // Filter products based on their price within the pack's price range
          const filteredData = data.filter(product => {
            const productPrice = product.price || 0;
            return productPrice >= priceRange.min && productPrice <= priceRange.max;
          });
          
          const categorizedProducts = {
            laptop: filteredData.filter(p => p.category === 'laptop'),
            desktop: filteredData.filter(p => p.category === 'desktop'),
            mobile: filteredData.filter(p => p.category === 'smartphone'),
            tablet: filteredData.filter(p => p.category === 'tablet'),
          };
          
          setProducts(categorizedProducts);
          
          // Initialize product quantities with zeros
          const initialQuantities: {[key: string]: number} = {};
          filteredData.forEach(product => {
            initialQuantities[product.id] = 0;
          });
          setProductQuantities(initialQuantities);
        }
      } catch (error) {
        console.error("Error in product fetch:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedPack]);

  // Calculate the total quantity for a category
  const getCategoryTotalQuantity = (category: string): number => {
    return Object.entries(productQuantities).reduce((total, [productId, quantity]) => {
      const product = products[category as keyof typeof products].find(p => p.id === productId);
      if (product) {
        return total + quantity;
      }
      return total;
    }, 0);
  };

  // Update the parent component when individual product quantities change
  useEffect(() => {
    const categoryTotals = {
      laptop: getCategoryTotalQuantity('laptop'),
      desktop: getCategoryTotalQuantity('desktop'),
      mobile: getCategoryTotalQuantity('mobile'),
      tablet: getCategoryTotalQuantity('tablet')
    };
    
    // For each category, update the parent component
    Object.entries(categoryTotals).forEach(([category, total]) => {
      if (total !== quantities[category as keyof typeof quantities]) {
        onQuantityChange(category, total);
      }
    });

    // For each category with products, check if a product is selected
    Object.entries(products).forEach(([category, categoryProducts]) => {
      if (categoryProducts.length > 0) {
        const selectedProductId = selectedHardware[category as keyof typeof selectedHardware];
        
        // Find a product with quantity > 0 if none is selected
        if (!selectedProductId) {
          const productWithQuantity = categoryProducts.find(p => 
            productQuantities[p.id] > 0
          );
          
          if (productWithQuantity) {
            onSelect(category, productWithQuantity.id);
          }
        }
        // If selected product has zero quantity, select another with quantity
        else if (productQuantities[selectedProductId] === 0) {
          const productWithQuantity = categoryProducts.find(p => 
            productQuantities[p.id] > 0
          );
          
          if (productWithQuantity) {
            onSelect(category, productWithQuantity.id);
          }
        }
      }
    });
  }, [productQuantities, products, onQuantityChange, onSelect, quantities, selectedHardware]);

  const handleProductIncrement = (productId: string) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const handleProductDecrement = (productId: string) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1)
    }));
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity >= 0) {
      setProductQuantities(prev => ({
        ...prev,
        [productId]: quantity
      }));
    }
  };

  const categories = [
    {
      id: "laptop",
      label: "Ordinateur portable",
      icon: <Laptop className="h-5 w-5" />,
      products: products.laptop,
    },
    {
      id: "desktop",
      label: "Ordinateur fixe",
      icon: <Monitor className="h-5 w-5" />,
      products: products.desktop,
    },
    {
      id: "mobile",
      label: "Smartphone",
      icon: <Smartphone className="h-5 w-5" />,
      products: products.mobile,
    },
    {
      id: "tablet",
      label: "Tablette",
      icon: <Tablet className="h-5 w-5" />,
      products: products.tablet,
    },
  ];

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
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : category.products && category.products.length > 0 ? (
              <RadioGroup
                value={selectedHardware[category.id as keyof typeof selectedHardware] || ""}
                onValueChange={(value) => onSelect(category.id, value)}
              >
                <div className="space-y-4">
                  {category.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem 
                          value={product.id} 
                          id={`${category.id}-${product.id}`}
                          disabled={productQuantities[product.id] === 0}
                        />
                        <Label 
                          htmlFor={`${category.id}-${product.id}`} 
                          className={`text-sm leading-snug cursor-pointer ${productQuantities[product.id] === 0 ? 'text-gray-400' : ''}`}
                        >
                          {product.name}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => handleProductDecrement(product.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          className="w-12 text-center h-7 px-1"
                          value={productQuantities[product.id] || 0}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => handleProductIncrement(product.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-sm text-gray-500 italic p-2">Aucun produit disponible dans cette catégorie pour cette formule</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HardwareOptions;
