
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Info } from "lucide-react";
import ProductCard from "./ProductCard";
import { toast } from "sonner";
import type { Product as ProductType } from "@/types/catalog"; // Renamed to avoid conflict

// Define the ProductVariant interface
interface ProductVariant {
  id: string;
  name: string;
  price: number;
  attributes: Record<string, any>;
}

// Define the custom product interface that extends the catalog product
export interface ProductWithVariants {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  sku: string;
  stock_status: string;
  image_url?: string;
  createdAt?: string;
  updatedAt?: string;
  is_parent?: boolean;
  variation_attributes?: Record<string, string[]>;
  variant_combination_prices?: any[];
  selected_variant_id?: string;
  attributes?: Record<string, any>;
  monthly_price?: number;
  active?: boolean; // Add active property to match Product interface
}

// Define the props interface
interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: ProductWithVariants) => void;
  onViewVariants?: (product: ProductWithVariants, e: React.MouseEvent) => void;
  title?: string;
  description?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onViewVariants,
  title = "Sélectionner un produit",
  description = "Parcourez notre catalogue pour ajouter un produit à votre offre"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
	const [selectedBrand, setSelectedBrand] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
	const [brands, setBrands] = useState<string[]>([]);

  // Load products from Supabase
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
    },
    enabled: isOpen // Only fetch when dialog is open
  });

  // Fetch categories and brands on component mount
  useEffect(() => {
    if (products) {
      // Extract unique categories and cast to string array
      const uniqueCategories = ['all', ...new Set(products.map(product => String(product.category)))];
      setCategories(uniqueCategories);

			// Extract unique brands and cast to string array
			const uniqueBrands = ['all', ...new Set(products.map(product => String(product.brand)))];
			setBrands(uniqueBrands);
    }
  }, [products]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

	// Handle brand selection
	const handleBrandSelect = (brand: string) => {
		setSelectedBrand(brand);
	};

  // Filter and map products based on search and category
  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    
    return products
      .filter(product => {
        const matchesSearch = !searchQuery || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        
        const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
        
        return matchesSearch && matchesCategory && matchesBrand;
      })
      .map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        brand: product.brand || '',
        category: product.category || '',
        image_url: product.image_url || '',
        sku: product.sku || '',
        stock_status: product.stock_status || 'in_stock',
        is_parent: product.is_parent || false,
        variation_attributes: product.variation_attributes || {},
        variant_combination_prices: product.variant_combination_prices || [],
        createdAt: product.created_at || '',
        updatedAt: product.updated_at || '',
        monthly_price: product.monthly_price || 0,
        active: product.active // Include active property
      })) as ProductWithVariants[];
  }, [products, searchQuery, selectedCategory, selectedBrand]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      
      <div className="p-4">
        <Input
          type="search"
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full"
        />
      </div>

			<Tabs defaultValue="category" className="p-4">
				<TabsList>
					<TabsTrigger value="category">Catégories</TabsTrigger>
					<TabsTrigger value="brand">Marques</TabsTrigger>
				</TabsList>
				<TabsContent value="category">
					<div className="flex flex-wrap gap-2 mt-2">
						{categories.map((category) => (
							<Button
								key={category}
								variant={selectedCategory === category ? "secondary" : "outline"}
								onClick={() => handleCategorySelect(category)}
								size="sm"
							>
								{category}
							</Button>
						))}
					</div>
				</TabsContent>
				<TabsContent value="brand">
					<div className="flex flex-wrap gap-2 mt-2">
						{brands.map((brand) => (
							<Button
								key={brand}
								variant={selectedBrand === brand ? "secondary" : "outline"}
								onClick={() => handleBrandSelect(brand)}
								size="sm"
							>
								{brand}
							</Button>
						))}
					</div>
				</TabsContent>
			</Tabs>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center p-8 text-red-500">
          <p>Erreur lors du chargement des produits</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <p>Aucun produit ne correspond à votre recherche</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product)}
                onViewVariants={onViewVariants ? (e) => onViewVariants(product, e) : undefined}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ProductSelector;
