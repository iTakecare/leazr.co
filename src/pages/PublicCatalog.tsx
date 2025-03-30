import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Cpu, Smartphone, Tablet, Monitor, LayoutGrid, ChevronDown } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/types/catalog";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = {
  label: string;
  value: string;
  direction: "asc" | "desc";
};

const PublicCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const sortOptions: SortOption[] = [
    { label: "Nom", value: "name", direction: "asc" },
    { label: "Prix (croissant)", value: "price", direction: "asc" },
    { label: "Prix (décroissant)", value: "price", direction: "desc" },
    { label: "Catégorie", value: "category", direction: "asc" }
  ];

  const handleSortChange = (option: SortOption) => {
    setSortBy(option.value);
    setSortDirection(option.direction);
  };

  useEffect(() => {
    if (products && products.length > 0) {
      console.log("Total products loaded:", products.length);
      
      const productsWithVariants = products.filter(p => 
        p.variants && p.variants.length > 0 || 
        p.variant_combination_prices && p.variant_combination_prices.length > 0 ||
        p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0
      );
      
      console.log("Products with variants:", productsWithVariants.length);
      
      productsWithVariants.forEach(p => {
        console.log(`Product "${p.name}" (${p.id}) variant info:`, {
          has_variants: p.variants && p.variants.length > 0,
          variants_count: p.variants?.length || 0,
          has_variant_prices: p.variant_combination_prices && p.variant_combination_prices.length > 0,
          variant_prices_count: p.variant_combination_prices?.length || 0,
          has_variation_attributes: p.variation_attributes && Object.keys(p.variation_attributes || {}).length > 0,
          variation_attributes: p.variation_attributes,
          monthly_price: p.monthly_price
        });
      });
    }
  }, [products]);

  const groupedProducts = React.useMemo(() => {
    const parentProducts = products.filter(p => 
      !p.parent_id && !p.is_variation
    );
    
    const variantMap = new Map<string, Product[]>();
    
    products.forEach(product => {
      if (product.parent_id) {
        const variants = variantMap.get(product.parent_id) || [];
        variants.push(product);
        variantMap.set(product.parent_id, variants);
      }
    });
    
    parentProducts.forEach(parent => {
      if (parent.id) {
        const variants = variantMap.get(parent.id) || [];
        parent.variants = variants;
        parent.is_parent = variants.length > 0 || 
                          (parent.variation_attributes && Object.keys(parent.variation_attributes).length > 0) ||
                          (parent.variant_combination_prices && parent.variant_combination_prices.length > 0);
      }
    });
    
    return parentProducts;
  }, [products]);

  const sortedAndFilteredProducts = React.useMemo(() => {
    const filteredProducts = groupedProducts.filter((product: Product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = !activeCategory || product.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
    
    return filteredProducts.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return sortDirection === "asc" 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        case "price":
          const priceA = a.monthly_price || 0;
          const priceB = b.monthly_price || 0;
          return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
        case "category":
          const catA = a.category || "";
          const catB = b.category || "";
          return sortDirection === "asc" 
            ? catA.localeCompare(catB) 
            : catB.localeCompare(catA);
        default:
          return 0;
      }
    });
  }, [groupedProducts, searchTerm, activeCategory, sortBy, sortDirection]);

  const handleProductClick = (product: Product) => {
    navigate(`/produits/${product.id}`);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    laptop: <Cpu className="h-5 w-5 mr-2" />,
    smartphone: <Smartphone className="h-5 w-5 mr-2" />,
    tablet: <Tablet className="h-5 w-5 mr-2" />,
    monitor: <Monitor className="h-5 w-5 mr-2" />,
    desktop: <LayoutGrid className="h-5 w-5 mr-2" />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="bg-gradient-to-br from-[#33638e] via-[#347599] to-[#4ab6c4] text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/2 lg:w-2/5">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#33638e]/70 to-[#33638e] z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1628258334105-2a0b3d6efee1?q=80&w=1974&auto=format&fit=crop" 
            alt="Groupe de personnes utilisant des ordinateurs portables sur une échelle" 
            className="h-full w-full object-cover object-center opacity-80"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold mb-4">Équipement premium reconditionné pour des équipes performantes</h1>
              <p className="text-lg mb-8">Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection de matériel Apple et PC haute qualité, à l'impact environnemental réduit.</p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" variant="outline" className="bg-white text-[#33638e] hover:bg-gray-100 border-white">
                  Parler à un conseiller
                </Button>
                <Button size="lg" className="bg-[#da2959]/80 hover:bg-[#da2959] border-0">
                  Demander un devis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <ScrollArea className="w-full mb-8">
          <ToggleGroup type="single" value={activeCategory || ""} onValueChange={(value) => setActiveCategory(value || null)} className="flex flex-nowrap">
            <ToggleGroupItem value="" className="whitespace-nowrap">
              Tous les produits
            </ToggleGroupItem>
            {categories.map((category) => (
              <ToggleGroupItem key={category.name} value={category.name} className="whitespace-nowrap">
                {categoryIcons[category.name]}
                {category.translation}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ScrollArea>
        
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-[#4ab6c4]/30 text-[#33638e]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  {sortOptions.find(opt => opt.value === sortBy && opt.direction === sortDirection)?.label || "Trier"}
                  <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem 
                    key={`${option.value}-${option.direction}`} 
                    className="cursor-pointer"
                    onClick={() => handleSortChange(option)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un produit..."
              className="pl-10 border-[#4ab6c4]/30 focus-visible:ring-[#33638e]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow animate-pulse h-[280px]">
                <div className="h-0 pb-[100%] bg-gray-200 rounded-t-lg"></div>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedAndFilteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium">Aucun produit trouvé</h3>
            <p className="text-gray-500 mt-2">
              Essayez de modifier vos critères de recherche ou consultez toutes nos catégories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedAndFilteredProducts.map((product) => (
              <ProductGridCard 
                key={product.id} 
                product={product} 
                onClick={() => handleProductClick(product)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
