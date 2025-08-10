
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestSteps from '@/components/checkout/RequestSteps';
import UnifiedNavigationBar from '@/components/layout/UnifiedNavigationBar';
import { useCart } from '@/context/CartContext';
import { ShoppingBag } from 'lucide-react';

const RequestPage: React.FC = () => {
  const { items } = useCart();
  
  // Redirect if cart is empty
  React.useEffect(() => {
    if (items.length === 0) {
      // We could redirect here, but better to show an empty state
    }
  }, [items]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigationBar 
        mode="minimal"
        backButton={{
          label: "Retour au panier",
          url: "/panier"
        }}
        title="Faire ma demande"
      />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        
        {items.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Vous devez ajouter des produits à votre panier avant de faire une demande.
            </p>
            <Button asChild>
              <Link to="/catalog/anonymous">Voir le catalogue</Link>
            </Button>
          </div>
        ) : (
          <RequestSteps />
        )}
      </div>
    </div>
  );
};

export default RequestPage;
