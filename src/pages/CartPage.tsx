
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import CartItem from '@/components/cart/CartItem';
import PublicHeader from '@/components/catalog/public/PublicHeader';

const CartPage: React.FC = () => {
  const { items, cartTotal, clearCart, cartCount } = useCart();
  
  // Log cart details for debugging
  React.useEffect(() => {
    console.log("CartPage rendered with:", { 
      itemCount: items.length, 
      cartTotal, 
      items: items.map(item => ({
        name: item.product.name,
        price: item.product.monthly_price,
        quantity: item.quantity,
        total: (item.product.monthly_price || 0) * item.quantity
      }))
    });
  }, [items, cartTotal]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Votre panier
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {cartCount} article{cartCount !== 1 ? 's' : ''}
            </span>
          </h1>
          <Link to="/catalogue">
            <Button variant="outline" size="sm" className="flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Continuer mes achats
            </Button>
          </Link>
        </div>
        
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Parcourez notre catalogue pour ajouter des produits à votre panier
            </p>
            <Link to="/catalogue">
              <Button>Voir le catalogue</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-medium">Détails du panier</h2>
                </div>
                
                <div className="divide-y">
                  {items.map((item) => (
                    <div className="p-4" key={item.product.id}>
                      <CartItem item={item} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
                <h2 className="font-medium mb-4">Résumé de la commande</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sous-total mensuel</span>
                    <span className="font-medium">{formatCurrency(cartTotal)} HT/mois</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-lg">Total</span>
                    <span className="font-bold text-lg text-[#2d618f]">
                      {formatCurrency(cartTotal)} HT/mois
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-4">
                    <Button 
                      className="w-full bg-[#2d618f] hover:bg-[#347599]"
                      asChild
                    >
                      <Link to="/demande-devis">
                        Demander un devis
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      onClick={clearCart}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Vider le panier
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
