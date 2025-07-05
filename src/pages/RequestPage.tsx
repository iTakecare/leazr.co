
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestSteps from '@/components/checkout/RequestSteps';
import MainNavigation from '@/components/layout/MainNavigation';
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
      <MainNavigation />
      
      <div className="container mx-auto px-4 pt-[130px] pb-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Faire ma demande</h1>
          <Link to="/panier">
            <Button variant="outline" size="sm" className="flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour au panier
            </Button>
          </Link>
        </div>
        
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
