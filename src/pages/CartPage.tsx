
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClientRequest } from "@/services/offers/clientRequests";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  image?: string;
  price: number;
  monthlyPrice: number;
  totalMonthlyPrice: number;
  quantity: number;
  selectedOptions: Record<string, string>;
  addedAt: string;
}

const CartPage = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer le total du panier
  const totalMonthlyPrice = cartItems.reduce((sum, item) => sum + item.totalMonthlyPrice, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // Charger le panier du stockage local
    const loadCart = () => {
      const cartJSON = localStorage.getItem('itakecare-cart') || '[]';
      try {
        const parsedCart = JSON.parse(cartJSON);
        setCartItems(parsedCart);
      } catch (error) {
        console.error("Erreur lors du chargement du panier:", error);
        setCartItems([]);
      }
    };

    loadCart();
  }, []);

  // Sauvegarder le panier lorsqu'il est mis à jour
  const saveCart = (items: CartItem[]) => {
    localStorage.setItem('itakecare-cart', JSON.stringify(items));
    setCartItems(items);
  };

  // Supprimer un article du panier
  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    saveCart(updatedCart);
    toast.success("Article supprimé du panier");
  };

  // Mettre à jour la quantité d'un article
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedCart = cartItems.map(item => {
      if (item.id === itemId) {
        const newTotalPrice = (item.monthlyPrice * newQuantity);
        return {
          ...item,
          quantity: newQuantity,
          totalMonthlyPrice: newTotalPrice
        };
      }
      return item;
    });
    
    saveCart(updatedCart);
  };

  // Vider le panier
  const clearCart = () => {
    saveCart([]);
    toast.success("Panier vidé");
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Préparation des données d'équipement pour la demande
      const equipmentData = cartItems.map(item => ({
        name: item.name,
        brand: "",
        description: "",
        specifications: item.selectedOptions,
        quantity: item.quantity,
        purchasePrice: item.price || 0,
        monthlyPayment: item.monthlyPrice,
        totalMonthly: item.totalMonthlyPrice,
      }));
      
      // JSON pour le stockage
      const equipmentDescription = JSON.stringify(equipmentData);
      
      // Texte descriptif pour la remarque
      const equipmentText = cartItems
        .map(item => `${item.name} (${item.quantity}x)`)
        .join(", ");
      
      // Calculer la commission (10% du prix mensuel total)
      const commission = totalMonthlyPrice * 0.1;
      
      // Calculer le montant total d'achat
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const { data, error } = await createClientRequest({
        client_name: name,
        client_email: email,
        equipment_description: equipmentDescription,
        amount: totalAmount,
        monthly_payment: totalMonthlyPrice,
        coefficient: 0, // Sera calculé côté serveur si nécessaire
        commission: commission,
        user_id: "anonymous",
        remarks: `Demande pour ${equipmentText}\nCommentaires: ${comments}\nSociété: ${company}`,
        type: "client_request",
      });
      
      if (error) {
        throw error;
      }
      
      // Vider le panier après une commande réussie
      clearCart();
      toast.success("Votre demande a été envoyée avec succès!");
      setIsCheckoutDialogOpen(false);
      navigate("/demande-envoyee");
    } catch (error) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      toast.error("Une erreur s'est produite lors de l'envoi de votre demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <PageTransition>
        <Container>
          <div className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <ShoppingCart className="h-8 w-8" />
                Mon panier
              </h1>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-xl font-medium mb-2">Votre panier est vide</h2>
                    <p className="text-gray-500 mb-6">Ajoutez des produits pour commencer</p>
                    <Button onClick={() => navigate('/catalogue')}>
                      Parcourir le catalogue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Mon panier
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Articles ({totalItems})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cartItems.map((item) => (
                      <div key={item.id} className="py-4 border-b last:border-0">
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-24 h-24 object-contain bg-gray-100 rounded"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                          <div className="flex-grow">
                            <h3 className="font-medium">{item.name}</h3>
                            {Object.entries(item.selectedOptions).length > 0 && (
                              <div className="mt-1 space-y-1">
                                {Object.entries(item.selectedOptions).map(([key, value]) => (
                                  <p key={key} className="text-sm text-gray-600">
                                    {key}: {value}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center border rounded">
                              <button 
                                className="px-3 py-1 border-r"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="px-4 py-1">{item.quantity}</span>
                              <button 
                                className="px-3 py-1 border-l"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(item.totalMonthlyPrice)}/mois
                            </p>
                            <button 
                              className="text-red-500 mt-2 text-sm flex items-center"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={clearCart}>
                        Vider le panier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Récapitulatif</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Durée</span>
                        <span>36 mois</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nombre d'articles</span>
                        <span>{totalItems}</span>
                      </div>
                      <Separator className="my-4" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total mensuel</span>
                        <span className="text-blue-600">{formatCurrency(totalMonthlyPrice)}</span>
                      </div>
                      <Button 
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                        onClick={() => setIsCheckoutDialogOpen(true)}
                      >
                        Demander un devis
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Sans engagement, validation manuelle par notre équipe
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Finaliser votre demande</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmitRequest} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom <span className="text-red-500">*</span></Label>
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre email"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nom de votre entreprise"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Résumé de votre panier</Label>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-40 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-gray-600">Quantité: {item.quantity}</p>
                      {Object.entries(item.selectedOptions).length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-700">Configuration:</p>
                          <ul className="text-xs text-gray-600 ml-2">
                            {Object.entries(item.selectedOptions).map(([key, value]) => (
                              <li key={key}>{key}: {value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                    <span className="font-medium">Mensualité totale:</span>
                    <span className="font-bold text-indigo-600">{formatCurrency(totalMonthlyPrice)}/mois</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comments">Commentaires additionnels</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Information supplémentaires pour votre demande"
                  rows={4}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCheckoutDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default CartPage;
