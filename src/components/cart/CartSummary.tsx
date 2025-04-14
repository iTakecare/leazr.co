
import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CartSummaryProps {
  cartTotal: number;
  itemsCount: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ cartTotal, itemsCount }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-4">
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">Récapitulatif</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Sous-total mensuel</span>
            <span className="font-medium">{formatCurrency(cartTotal)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Articles</span>
            <span className="font-medium">{itemsCount}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Frais de livraison</span>
            <span className="font-medium">Gratuit</span>
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex justify-between text-lg">
            <span className="font-medium">Total mensuel</span>
            <span className="font-bold text-blue-600">{formatCurrency(cartTotal)}</span>
          </div>
          
          <p className="text-xs text-gray-500">
            Prix HT pour une durée de 36 mois. Engagement ferme.
          </p>
        </div>
        
        <Button className="w-full mt-6" size="lg" asChild>
          <Link to="/client/requests/new">
            Passer ma demande
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        
        <div className="mt-4 text-center">
          <Button variant="link" asChild>
            <Link to="/catalogue">Continuer mes achats</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
