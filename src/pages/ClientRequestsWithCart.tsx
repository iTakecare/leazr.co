
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useClientOffers } from "@/hooks/useClientOffers";
import ClientsError from "@/components/clients/ClientsError";
import { Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ClientOrderForm from "@/components/client-cart/ClientOrderForm";
import ClientCart from "@/components/client-cart/ClientCart";
import { useClientCart } from "@/context/ClientCartContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientLayout } from "@/components/layout/ClientRoutes";

const ClientRequestsWithCart = () => {
  const { offers, loading, error, refresh } = useClientOffers();
  const [searchParams] = useSearchParams();
  const { getTotalItems } = useClientCart();
  const navigate = useNavigate();
  
  const action = searchParams.get('action');
  const [activeTab, setActiveTab] = useState('requests');
  const cartItemCount = getTotalItems();

  useEffect(() => {
    if (action === 'order' && cartItemCount > 0) {
      setActiveTab('order');
    } else if (action === 'view-cart') {
      setActiveTab('cart');
    } else {
      setActiveTab('requests');
    }
  }, [action, cartItemCount]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'requests') {
      navigate('/client/requests');
    } else if (value === 'cart') {
      navigate('/client/requests?action=view-cart');
    } else if (value === 'order') {
      navigate('/client/requests?action=order');
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="w-full p-8">
          <h1 className="text-3xl font-bold mb-6">Mes Demandes</h1>
          <div className="flex flex-col justify-center items-center min-h-[300px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Chargement des demandes...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <ClientsError errorMessage={error} onRetry={refresh} />
      </ClientLayout>
    );
  }

  // Si le panier est vide et que l'utilisateur essaie d'aller sur l'onglet de commande, le rediriger vers le panier
  if (activeTab === 'order' && cartItemCount === 0) {
    navigate('/client/requests?action=view-cart');
    return null;
  }

  return (
    <ClientLayout>
      <div className="w-full p-4 md:p-6">
        <div className="mb-6 bg-muted/30 p-4 rounded-lg">
          <h1 className="text-3xl font-bold">Mes Demandes</h1>
          <p className="text-muted-foreground">Gérez vos demandes d'équipement</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="requests">Mes demandes</TabsTrigger>
            <TabsTrigger value="cart" className="relative">
              Mon panier
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="order" disabled={cartItemCount === 0}>
              Commander
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requests">
            <Card className="border-none shadow-md">
              <CardContent className="p-0">
                {/* Contenu original de la page de demandes */}
                <div className="p-6">
                  {/* Ce composant sera laissé tel quel, nous ne modifions pas le code existant */}
                  <p className="text-muted-foreground">Vos demandes seront affichées ici.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cart">
            <ClientCart />
          </TabsContent>
          
          <TabsContent value="order">
            <ClientOrderForm />
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
};

export default ClientRequestsWithCart;
