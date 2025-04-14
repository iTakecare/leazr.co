
import React from "react";
import { useClientCart } from "@/context/ClientCartContext";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trash2, Minus, Plus, ShoppingBasket, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClientOrderForm from "./ClientOrderForm";
import { motion } from "framer-motion";

const ClientCart = () => {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    updateDuration, 
    clearCart, 
    getTotalPrice, 
    getMonthlyPrice 
  } = useClientCart();
  const [showOrderForm, setShowOrderForm] = React.useState(false);
  const navigate = useNavigate();

  const handleContinueShopping = () => {
    navigate("/client/catalog");
  };

  const handleSubmitOrder = () => {
    if (items.length === 0) return;
    setShowOrderForm(true);
  };

  if (showOrderForm) {
    return <ClientOrderForm onBack={() => setShowOrderForm(false)} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Mon Panier</h2>
      
      {items.length === 0 ? (
        <Card className="border-dashed border-2 bg-background">
          <CardContent className="py-12 flex flex-col items-center justify-center">
            <ShoppingBasket className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Votre panier est vide</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Vous n'avez pas encore ajouté de produits à votre panier.
              Parcourez notre catalogue pour trouver l'équipement dont vous avez besoin.
            </p>
            <Button onClick={handleContinueShopping}>
              Voir le catalogue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Articles ({items.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vider le panier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {items.map((item) => (
                    <motion.li 
                      key={item.product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-shrink-0 w-20 h-20 bg-muted/30 rounded flex items-center justify-center overflow-hidden">
                          {item.product.images && item.product.images.length > 0 ? (
                            <img 
                              src={item.product.images[0]} 
                              alt={item.product.name} 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ShoppingBasket className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-grow">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.product.brand || 'Marque non spécifiée'}
                          </p>
                          
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {Object.entries(item.selectedOptions).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-2">
                          <div className="text-primary font-medium">
                            {formatCurrency(Number(item.product.price))}
                          </div>
                          
                          <div className="flex items-center">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-10 text-center">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center mt-1">
                            <label className="text-xs mr-2">Durée (mois):</label>
                            <select 
                              className="text-xs border rounded p-1" 
                              value={item.duration} 
                              onChange={(e) => updateDuration(item.product.id, parseInt(e.target.value))}
                            >
                              {[12, 24, 36, 48, 60].map(months => (
                                <option key={months} value={months}>{months}</option>
                              ))}
                            </select>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeItem(item.product.id)} 
                            className="text-destructive mt-1 h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{formatCurrency(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensualité estimée</span>
                  <span className="font-medium text-primary">
                    {formatCurrency(getMonthlyPrice())}/mois
                  </span>
                </div>
                <div className="bg-muted/20 p-3 rounded-md text-xs text-muted-foreground">
                  Les mensualités sont calculées à titre indicatif et peuvent varier selon les conditions exactes de votre contrat de location.
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button 
                  className="w-full" 
                  onClick={handleSubmitOrder}
                  disabled={items.length === 0}
                >
                  Passer ma demande
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleContinueShopping}
                >
                  Continuer mes achats
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCart;
