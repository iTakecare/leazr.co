
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { Separator } from '@/components/ui/separator';
import { Trash2, X, ShoppingBag, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import CartItem from './CartItem';
import { ScrollArea } from '@/components/ui/scroll-area';

const CartDrawer: React.FC = () => {
  const { items, isCartOpen, setIsCartOpen, cartTotal, clearCart, cartCount } = useCart();
  
  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg flex flex-col h-full p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Votre panier
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {cartCount} article{cartCount !== 1 ? 's' : ''}
                </span>
              </SheetTitle>
              <SheetDescription>
                Gérez les articles dans votre panier de location
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>
        
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Parcourez notre catalogue pour ajouter des produits à votre panier
            </p>
            <SheetClose asChild>
              <Link to="/catalogue">
                <Button>Voir le catalogue</Button>
              </Link>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem key={item.product.id} item={item} />
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t mt-auto">
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
                
                <div className="flex flex-col gap-2">
                  <Button 
                    className="w-full bg-[#2d618f] hover:bg-[#347599]"
                    onClick={() => setIsCartOpen(false)}
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
