import React from 'react';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import ClientProductRequestForm from './ClientProductRequestForm';

const ClientRequestSteps: React.FC = () => {
  const { navigateToClient } = useRoleNavigation();
  const { items } = useCart();
  
  // Redirect if cart is empty
  React.useEffect(() => {
    if (items.length === 0) {
      navigateToClient('panier');
    }
  }, [items, navigateToClient]);
  
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Vous devez ajouter des produits à votre panier avant de faire une demande.
            </p>
            <Button onClick={() => navigateToClient('products')}>
              Voir le catalogue
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Finaliser ma demande</h1>
          <Button variant="outline" size="sm" onClick={() => navigateToClient('panier')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour au panier
          </Button>
        </div>
        
        <ClientProductRequestForm />
      </div>
    </div>
  );
};

export default ClientRequestSteps;