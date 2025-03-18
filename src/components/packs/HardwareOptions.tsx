
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
  
  const [loading, setLoading] = useState(true);

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
          const categorizedProducts = {
            laptop: data.filter(p => p.category === 'laptop'),
            desktop: data.filter(p => p.category === 'desktop'),
            mobile: data.filter(p => p.category === 'smartphone'),
            tablet: data.filter(p => p.category === 'tablet'),
          };
          
          setProducts(categorizedProducts);
        }
      } catch (error) {
        console.error("Error in product fetch:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

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

  const handleIncrement = (category: string) => {
    const currentQuantity = quantities[category as keyof typeof quantities];
    onQuantityChange(category, currentQuantity + 1);
  };

  const handleDecrement = (category: string) => {
    const currentQuantity = quantities[category as keyof typeof quantities];
    if (currentQuantity > 0) {
      onQuantityChange(category, currentQuantity - 1);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {categories.map((category) => (
        <Card key={category.id} className="overflow-hidden">
          <div className="bg-gray-50 p-4 flex items-center justify-between border-b">
            <div className="flex items-center space-x-3">
              {category.icon}
              <h3 className="font-medium">{category.label}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleDecrement(category.id)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                className="w-14 text-center h-8"
                value={quantities[category.id as keyof typeof quantities]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    onQuantityChange(category.id, value);
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleIncrement(category.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
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
                disabled={quantities[category.id as keyof typeof quantities] === 0}
              >
                <div className="space-y-3">
                  {category.products.map((product) => (
                    <div key={product.id} className="flex items-start space-x-2">
                      <RadioGroupItem 
                        value={product.id} 
                        id={`${category.id}-${product.id}`}
                        disabled={quantities[category.id as keyof typeof quantities] === 0}
                      />
                      <Label 
                        htmlFor={`${category.id}-${product.id}`} 
                        className={`text-sm leading-snug cursor-pointer ${quantities[category.id as keyof typeof quantities] === 0 ? 'text-gray-400' : ''}`}
                      >
                        {product.name}
                        {product.monthly_price && <span className="ml-2 text-xs text-gray-500">({product.monthly_price}€/mois)</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-sm text-gray-500 italic p-2">Aucun produit disponible dans cette catégorie</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HardwareOptions;
