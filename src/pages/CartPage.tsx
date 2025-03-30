
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Separator } from "@/components/ui/separator";
import { MinusIcon, PlusIcon, Trash2, ArrowLeft } from "lucide-react";

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, getTotalItems, clearCart } = useCart();
  const navigate = useNavigate();
  
  const handleCheckout = () => {
    // Rediriger vers la page d'inscription/connexion
    navigate("/inscription");
  };
  
  const calculateTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = item.product.price || 0;
      return total + price * item.quantity;
    }, 0);
  };
  
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Votre panier est vide</h2>
          <p className="text-gray-600 mb-8">Parcourez notre catalogue pour ajouter des produits à votre panier.</p>
          <Button onClick={() => navigate("/catalogue")}>
            Voir le catalogue
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/catalogue")}
            className="flex items-center text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au catalogue
          </Button>
          <h1 className="text-3xl font-bold ml-4">Votre panier</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Articles du panier ({getTotalItems()})
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vider le panier
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                {items.map((item) => (
                  <div key={item.product.id} className="py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={item.product.image_url || "/placeholder.svg"} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {item.product.brand && `${item.product.brand} - `}
                          {item.product.category}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, value]) => (
                            <div key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {key}: <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-2">
                          <div className="flex items-center">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-r-none"
                              onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <div className="h-8 px-4 flex items-center justify-center border-y">
                              {item.quantity}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-l-none"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="font-bold">
                              {formatCurrency(item.product.price || 0)} HT/mois
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Récapitulatif</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span>{formatCurrency(calculateTotalPrice())} HT/mois</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais de service</span>
                  <span>Inclus</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Total</span>
                <span>{formatCurrency(calculateTotalPrice())} HT/mois</span>
              </div>
              
              <Button 
                className="w-full bg-[#2d618f] hover:bg-[#347599]"
                onClick={handleCheckout}
              >
                Continuer
              </Button>
              
              <p className="text-sm text-gray-600 mt-4">
                En poursuivant, vous acceptez la crétion d'un compte client pour faire votre demande de leasing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
