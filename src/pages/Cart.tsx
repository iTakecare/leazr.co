
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Separator } from "@/components/ui/separator";

const Cart = () => {
  const { items, totalItems, removeFromCart } = useCart();
  const navigate = useNavigate();
  
  const totalMonthlyPrice = items.reduce((total, item) => {
    const itemPrice = item.product.monthly_price || 0;
    return total + (itemPrice * item.quantity);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Votre panier</h1>
        <p className="text-gray-600 mb-6">
          {totalItems === 0 ? 
            "Votre panier est vide" : 
            `${totalItems} produit${totalItems > 1 ? 's' : ''} dans votre panier`
          }
        </p>
        
        {totalItems === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingCart className="h-16 w-16 text-gray-300" />
            </div>
            <h2 className="text-xl font-medium mb-2">Votre panier est vide</h2>
            <p className="text-gray-500 mb-6">Découvrez notre catalogue pour trouver des produits adaptés à vos besoins</p>
            <Button onClick={() => navigate('/catalogue')}>
              Parcourir le catalogue
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {items.map((item, index) => (
                  <React.Fragment key={`${item.product.id}-${index}`}>
                    {index > 0 && <Separator />}
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {item.product.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium">{item.product.name}</h3>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            {item.product.brand && (
                              <span className="mr-2">Marque: {item.product.brand}</span>
                            )}
                            {item.duration && (
                              <span>Durée: {item.duration} mois</span>
                            )}
                          </div>
                          
                          {Object.entries(item.selectedOptions || {}).length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Options sélectionnées:</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(item.selectedOptions || {}).map(([key, value]) => (
                                  <span 
                                    key={key} 
                                    className="text-xs bg-gray-100 px-2 py-1 rounded"
                                  >
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium text-[#2d618f]">
                            {formatCurrency(item.product.monthly_price || 0)} / mois
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Quantité: {item.quantity}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-500 hover:text-red-500 mt-2"
                            onClick={() => removeFromCart(item.product.id || '')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={() => navigate('/catalogue')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continuer les achats
                </Button>
              </div>
            </div>
            
            <div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-medium mb-4">Résumé de votre demande</h2>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total mensuel</span>
                    <span>{formatCurrency(totalMonthlyPrice)} / mois</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between font-medium mb-6">
                  <span>Total mensuel</span>
                  <span className="text-[#2d618f]">{formatCurrency(totalMonthlyPrice)} / mois</span>
                </div>
                
                <Button 
                  className="w-full bg-[#2d618f] hover:bg-[#347599]"
                  onClick={() => navigate('/signup-business')}
                >
                  Finaliser votre demande
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
