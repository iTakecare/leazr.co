
import React from 'react';
import { useClientCart } from '@/context/ClientCartContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { Trash2, ShoppingBag, PlusCircle, MinusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ClientCart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useClientCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProceedToOrder = () => {
    navigate('/client/requests?action=order');
  };

  if (!items.length) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
          <p className="text-muted-foreground text-center max-w-xs mb-6">
            Explorez notre catalogue pour ajouter des équipements à votre panier
          </p>
          <Button asChild>
            <a href="/client/catalog">Voir le catalogue</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-gradient-to-r from-muted/20 to-transparent border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg md:text-xl">Mon panier d'équipements</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 h-8 hover:text-red-700 hover:bg-red-50"
            onClick={clearCart}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Vider
          </Button>
        </div>
      </CardHeader>
      
      <ScrollArea className="max-h-[400px]">
        <CardContent className="p-4">
          {items.map((item) => (
            <div
              key={`${item.product.id}-${JSON.stringify(item.selectedOptions)}`}
              className="flex py-3 border-b last:border-0"
            >
              <div className="h-16 w-16 rounded-md bg-muted/20 flex-shrink-0 overflow-hidden">
                <img 
                  src={item.product.image_url || '/placeholder.svg'} 
                  alt={item.product.name}
                  className="h-full w-full object-contain"
                />
              </div>
              
              <div className="ml-3 flex-grow">
                <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(item.selectedOptions || {}).map(([key, value]) => (
                    <span key={key} className="mr-2">
                      {key}: {value}
                    </span>
                  ))}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium mr-2">
                      {formatCurrency(
                        (item.monthlyPrice || item.product.monthly_price || 0) * item.quantity
                      )}
                      <span className="text-xs text-muted-foreground">/mois</span>
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
      
      <CardFooter className="flex flex-col p-4 bg-muted/10">
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Nombre d'articles:</span>
            <span className="font-medium">{getTotalItems()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Loyer mensuel total:</span>
            <span className="font-medium text-lg text-primary">
              {formatCurrency(getTotalPrice())}/mois
            </span>
          </div>
          <Separator className="my-3" />
          <Button 
            className="w-full"
            onClick={handleProceedToOrder}
          >
            Faire ma demande
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ClientCart;
