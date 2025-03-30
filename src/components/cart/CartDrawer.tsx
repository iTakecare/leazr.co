
import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash, X, MinusCircle, PlusCircle, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  triggerClassName?: string;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ triggerClassName = "" }) => {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    // Rediriger vers la page de demande d'offre ou de commande
    navigate("/catalogue/demande");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={`relative ${triggerClassName}`}
        >
          <ShoppingCart className="h-5 w-5" />
          {getTotalItems() > 0 && (
            <Badge 
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
            >
              {getTotalItems()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b pb-3">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Votre panier
            </div>
            {items.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 text-xs"
                onClick={clearCart}
              >
                <Trash className="h-3.5 w-3.5 mr-1" />
                Vider
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-1">Votre panier est vide</h3>
            <p className="text-gray-500 text-sm text-center max-w-xs mb-6">
              Ajoutez des produits à votre panier pour demander un devis personnalisé
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsOpen(false);
                navigate("/catalogue");
              }}
            >
              Continuer mes achats
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.product.id}-${JSON.stringify(item.selectedAttributes)}`} className="flex gap-3">
                    <div className="w-20 h-20 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                      <img
                        src={item.product.image_url || "/placeholder.svg"} 
                        alt={item.product.name}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium">{item.product.name}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          {Object.entries(item.selectedAttributes).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: <strong>{value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="font-medium text-sm text-blue-600">
                          {formatCurrency((item.product.monthly_price || 0) * item.quantity)}/mois
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="border-t pt-4 mt-auto">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nombre d'articles</span>
                  <span>{getTotalItems()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total mensuel</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(getTotalPrice())}/mois</span>
                </div>
                <p className="text-xs text-gray-500">Hors taxes. Engagement sur 36 mois par défaut.</p>
              </div>
              
              <div className="mt-4 space-y-3">
                <Button 
                  className="w-full bg-[#2d618f] hover:bg-[#347599]"
                  onClick={handleCheckout}
                >
                  Demander un devis
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/catalogue");
                  }}
                >
                  Continuer mes achats
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
