
import React, { useState } from 'react';
import ProductCatalog from '@/components/catalog/ProductCatalog';
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import ProductDetailPage from '@/pages/ProductDetailPage';
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PublicCatalog = () => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { cartCount } = useCart();
  
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
    navigate('/client/cart');
  };

  return (
    <div className="h-full w-full overflow-auto relative">
      {/* Mini cart button fixed at the top right */}
      <div className="fixed top-4 right-4 z-10">
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
        <ClientProductDetail 
          productId={selectedProductId} 
          onBackToCatalog={handleBackToCatalog} 
        />
      ) : (
        <ProductCatalog 
          hideNavigation={true} 
          isOpen={true} 
          useDialog={false}
          onProductClick={handleProductClick}
        />
      )}
    </div>
  );
};

// Client version of the product detail that stays within the client dashboard
const ClientProductDetail = ({ productId, onBackToCatalog }: { productId: string, onBackToCatalog: () => void }) => {
  return (
    <div className="pt-0">
      <div className="mb-4 ml-4">
        <Button 
          variant="outline" 
          onClick={onBackToCatalog}
          className="text-[#2d618f]"
        >
          ← Retour au catalogue
        </Button>
      </div>
      <ProductDetailPage 
        id={productId} 
        hideNavigation={true} 
        inClientDashboard={true}
      />
    </div>
  );
};

export default PublicCatalog;
