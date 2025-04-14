
import React, { useState } from 'react';
import PublicCatalogHeader from '@/components/catalog/public/PublicCatalogHeader';
import PublicCatalogFilters from '@/components/catalog/public/PublicCatalogFilters';
import PublicProductGrid from '@/components/catalog/public/PublicProductGrid';
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import ProductDetailPage from '@/pages/ProductDetailPage';
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '@/components/catalog/public/PublicHeader';

const PublicCatalog = () => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [filterVisible, setFilterVisible] = useState(true);
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: () => getProducts(),
  });

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
  };
  
  const handleBackToCatalog = () => {
    setSelectedProductId(null);
  };
  
  const handleCartClick = () => {
    navigate('/panier');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-6">
        {/* Mini cart button fixed at the top right */}
        <div className="fixed top-24 right-4 z-10">
          <Button 
            onClick={handleCartClick}
            className="bg-[#2d618f] hover:bg-[#347599] rounded-full h-12 w-12 flex items-center justify-center"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
        
        {selectedProductId ? (
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={handleBackToCatalog}
              className="text-[#2d618f] mb-6"
            >
              ← Retour au catalogue
            </Button>
            <ProductDetailPage 
              id={selectedProductId} 
              hideNavigation={true} 
              inClientDashboard={false}
            />
          </div>
        ) : (
          <div>
            <PublicCatalogHeader />
            
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className={`lg:col-span-1 ${filterVisible ? 'block' : 'hidden'} lg:block`}>
                <PublicCatalogFilters 
                  products={products} 
                  isLoading={isLoading} 
                  onToggleFilters={() => setFilterVisible(!filterVisible)}
                />
              </div>
              
              <div className="lg:col-span-3">
                <PublicProductGrid 
                  products={products} 
                  isLoading={isLoading} 
                  onProductClick={handleProductClick}
                  onToggleFilters={() => setFilterVisible(!filterVisible)}
                  filterVisible={filterVisible}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
