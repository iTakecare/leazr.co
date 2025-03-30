
import React from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash, ChevronLeft, MinusCircle, PlusCircle, PackageCheck, InfoIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHeader from '@/components/catalog/public/PublicHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="container mx-auto px-4 py-12 flex-1">
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="bg-gray-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Votre panier est vide</h1>
            <p className="text-gray-500 mb-8">
              Vous n'avez aucun article dans votre panier. Ajoutez des produits pour demander un devis personnalisé.
            </p>
            <Button 
              onClick={() => navigate('/catalogue')}
              className="bg-[#2d618f] hover:bg-[#347599]"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour au catalogue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Votre panier</h1>
          <p className="text-gray-500 mb-6">
            Vérifiez et ajustez votre sélection avant de demander un devis
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Articles ({getTotalItems()})</CardTitle>
                    <Button variant="ghost" size="sm" className="text-gray-500" onClick={clearCart}>
                      <Trash className="h-4 w-4 mr-2" /> Vider le panier
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${JSON.stringify(item.selectedAttributes)}`} 
                      className="flex border-b last:border-0 p-4"
                    >
                      <div className="w-24 h-24 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                        <img
                          src={item.product.image_url || "/placeholder.svg"} 
                          alt={item.product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="flex-1 px-4">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                          <div className="mt-1 text-sm text-gray-500">
                            {Object.entries(item.selectedAttributes).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: <strong>{value}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-[#2d618f]">
                              {formatCurrency((item.product.monthly_price || 0) * item.quantity)}/mois
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(item.product.monthly_price || 0)}/mois par unité
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="border-t p-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/catalogue')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Continuer mes achats
                  </Button>
                </CardFooter>
              </Card>

              <Alert className="bg-blue-50 border-blue-200">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-600">Besoin d'aide pour votre choix ?</AlertTitle>
                <AlertDescription>
                  Nos conseillers sont disponibles pour vous guider dans votre sélection d'équipement.
                  <Button variant="link" className="text-blue-600 p-0 h-auto font-medium">
                    Contactez-nous
                  </Button>
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Résumé de la commande</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sous-total mensuel</span>
                    <span>{formatCurrency(getTotalPrice())}/mois</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nombre d'articles</span>
                    <span>{getTotalItems()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-medium">Total mensuel</span>
                    <span className="text-lg font-bold text-[#2d618f]">{formatCurrency(getTotalPrice())}/mois</span>
                  </div>
                  <p className="text-xs text-gray-500">Hors taxes. Engagement sur 36 mois par défaut.</p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                  <Button 
                    className="w-full bg-[#2d618f] hover:bg-[#347599]"
                    onClick={() => navigate('/catalogue/demande')}
                  >
                    <PackageCheck className="h-4 w-4 mr-2" />
                    Demander un devis
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-gray-700"
                    onClick={() => navigate('/catalogue')}
                  >
                    Continuer mes achats
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
