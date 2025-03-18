
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowUpDown, Cpu, Smartphone, Tablet, Monitor, LayoutGrid } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/types/catalog";
import { useNavigate } from "react-router-dom";

const PublicCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // Group products by parent/child relationship to avoid showing variants as separate products
  const groupedProducts = React.useMemo(() => {
    // First pass: collect all parent products and standalone products
    const parentProducts = products.filter(p => 
      !p.parent_id && !p.is_variation
    );
    
    // Create a map of parent IDs to array of variant products
    const variantMap = new Map<string, Product[]>();
    
    // Second pass: organize variants by parent
    products.forEach(product => {
      if (product.parent_id) {
        const variants = variantMap.get(product.parent_id) || [];
        variants.push(product);
        variantMap.set(product.parent_id, variants);
      }
    });
    
    // Attach variants to parents
    parentProducts.forEach(parent => {
      if (parent.id) {
        const variants = variantMap.get(parent.id) || [];
        // Ensure we're setting an array of Product objects, not ProductVariant objects
        parent.variants = variants;
        // Mark parent if it has variants
        parent.is_parent = variants.length > 0;
      }
    });
    
    return parentProducts;
  }, [products]);

  const filteredProducts = groupedProducts.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !activeCategory || product.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

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
      
      {/* Hero Banner */}
      <div className="bg-indigo-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">Tous les appareils nécessaires au développement de votre entreprise</h1>
            <p className="text-lg mb-8">Ne soyez plus jamais bloqués par les performances de votre équipement. Choisissez la sérénité avec la location d'appareils.</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" variant="outline" className="bg-white text-indigo-900 hover:bg-gray-100">
                Parler à un conseiller
              </Button>
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                Demander un devis
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Navigation */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={activeCategory === category.name ? "default" : "outline"}
              className="flex items-center justify-center h-20"
              onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
            >
              <div className="flex flex-col items-center">
                <div className="mb-1">
                  {categoryIcons[category.name] || <LayoutGrid className="h-5 w-5" />}
                </div>
                <span>{category.translation}</span>
              </div>
            </Button>
          ))}
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un produit..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" className="flex items-center">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Trier
            </Button>
          </div>
        </div>
        
        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
                <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium">Aucun produit trouvé</h3>
            <p className="text-gray-500 mt-2">
              Essayez de modifier vos critères de recherche ou consultez toutes nos catégories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
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
